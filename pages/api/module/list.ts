// 导入所需的模块
import { NextRequest } from "next/server";
import { verifyToken } from "../../../common/auth";

export const config = { runtime: "edge" };

export default async function handler(req: NextRequest) {
  try {
    if (req.method === "GET") {
      // 从请求中获取 JSON 数据
      const _cookie_token = req.cookies.get('token')?.value;
      const verifyResult = await verifyToken(_cookie_token);
      if (verifyResult.code !== 200) {
        return verifyResult.data;
      }
      const userid = verifyResult.data.userid;

      const _pageSize = req.nextUrl.searchParams.get("pageSize");
      const _current = req.nextUrl.searchParams.get("current");
      if (_pageSize == undefined || _current == undefined) {
        return new Response(
          JSON.stringify({
            code: 400,
            message: "参数错误",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }
      const pageSize = parseInt(_pageSize);
      const current = parseInt(_current);

      // 计算偏移量
      const offset = (current - 1) * pageSize;

      // 实现分页查询
      const result = await process.env.DB
        .prepare(
          "SELECT moduleid,modulename,moduledescription,moduletype,module_extra_enable,module_extra_argname,module_extra_column_name,module_extra_func_name,(userid = ?) AS is_self FROM modules WHERE userid=? OR moduletype=1 LIMIT ? OFFSET ?"
        )
        .bind(userid, userid, pageSize, offset)
        .all()
        .then((query_result: any) => {
          return query_result.results.map((row: any) => ({
            moduleid: row.moduleid,
            modulename: row.modulename,
            moduledescription: row.moduledescription,
            moduletype: row.moduletype,
            module_extra_enable: row.module_extra_enable,
            module_extra_argname: row.module_extra_argname,
            module_extra_column_name: row.module_extra_column_name,
            module_extra_func_name: row.module_extra_func_name,
            is_self: row.is_self
          }));
        });

      const count_result = await process.env.DB.prepare(
        "SELECT count(*)as total FROM modules WHERE userid=? OR moduletype=0"
      ).bind(userid).first().then((query_result: any) => {
        return {
          total: query_result.total
        }
      });

      // 返回响应
      return new Response(
        JSON.stringify({
          code: 200,
          message: 'success',
          success: true,
          page: current,
          data: result,
          total: count_result.total
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          code: 400,
          message: "接口错误",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
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
