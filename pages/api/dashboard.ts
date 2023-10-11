import { NextRequest } from "next/server";
import { verifyToken } from "../../common/auth";

export const config = { runtime: "edge" };
// type CfNextRequest = NextRequest & { env: any };

export default async function handler(req: NextRequest) {
  try {
    const _cookie_token = req.cookies.get('token')?.value;
    const verifyResult = await verifyToken(_cookie_token);
    if (verifyResult.code !== 200) {
      return verifyResult.data;
    }
    const userid = verifyResult.data.userid;

    // 项目数量
    const project_count = await process.env.DB
      .prepare("SELECT count(1) AS count FROM projects WHERE userid = ?")
      .bind(userid)
      .first().then((query_result: any) => {
        return query_result.count;
      });

    // 总访问量
    const accesslog_total_count = await process.env.DB
      .prepare("SELECT COUNT(*) AS count FROM accesslog WHERE projecturl IN ( SELECT projecturl FROM projects WHERE userid = ? )")
      .bind(userid)
      .first().then((query_result: any) => {
        return query_result.count;
      });

    // 本月总访问量
    const accesslog_month_count = await process.env.DB
      .prepare("SELECT COUNT(*) AS count FROM accesslog WHERE projecturl IN ( SELECT projecturl FROM projects WHERE userid = ?) AND strftime('%Y-%m', requestdate/1000, 'unixepoch') = strftime('%Y-%m', 'now')")
      .bind(userid)
      .first().then((query_result: any) => {
        return query_result.count;
      });
    // 近七天每天的访问量
    const accesslog_week_count = await process.env.DB
      .prepare("SELECT strftime('%m-%d', datetime(requestdate / 1000, 'unixepoch')) AS visit_date, COUNT(*) AS daily_visits FROM accesslog WHERE projecturl IN ( SELECT projecturl FROM projects WHERE userid = ? ) AND datetime(requestdate / 1000, 'unixepoch') >= datetime('now', '-7 days') GROUP BY visit_date ORDER BY visit_date;")
      .bind(userid)
      .all().then((query_result: any) => {
        // 创建一个数组来存储最终结果
        const result = [];
        const currentDate = new Date();
        // 遍历过去的7天
        for (let i = 0; i < 7; i++) {
          // 获取当前迭代的日期
          const date = new Date(currentDate.getTime() - i * 24 * 60 * 60 * 1000);
          // 将日期格式化为"MM-DD"的形式
          const formattedDate = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
          // 在查询结果中查找对应的行
          const row = query_result.results.find((r: any) => r.visit_date === formattedDate);
          // 创建一个新对象，包含日期和访问量
          const entry = {
            Date: formattedDate,
            Value: row ? row.daily_visits : 0,
          };
          // 将条目添加到结果数组中
          result.push(entry);
        }
        return result;
      });
    const currentDate = new Date();
    const currentFormattedDate = `${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
    const accesslog_today_count = accesslog_week_count.find((r: any) => r.Date === currentFormattedDate)?.Value;

    // 获取项目统计信息
    const project_statistic_data = await process.env.DB
      .prepare("SELECT p.projectname AS projectname, COUNT(*) AS count FROM accesslog a JOIN projects p ON a.projecturl = p.projecturl WHERE p.userid = ? GROUP BY p.projectname")
      .bind(userid)
      .all().then((query_result: any) => {
        const totalCount = query_result.results.reduce((sum: number, row: any) => sum + row.count, 0);
        return query_result.results.map((row: any) => ({
          name: row.projectname,
          count: row.count,
          progress: (row.count / totalCount) * 100 // 计算占比
        }));
      });

    // 返回模块信息
    return new Response(
      JSON.stringify({
        code: 200,
        message: "success",
        data: { project_count, accesslog_total_count, accesslog_month_count, accesslog_today_count, accesslog_week_count, project_statistic_data },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        code: 500,
        message: "服务器内部错误"
      }),
      {
        status: 500
      }
    );
  }
}
