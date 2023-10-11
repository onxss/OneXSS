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

      const _moduleid = req.nextUrl.searchParams.get("moduleid");
      if (_moduleid == undefined) {
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
      const moduleid = parseInt(_moduleid);
      const query_result_count = await process.env.DB.prepare("SELECT count(1) AS count FROM project_modules WHERE moduleid=?")
        .bind(moduleid).first()
        .then((query_result: any) => {
          return query_result.count;
        });
      if (parseInt(query_result_count) > 0) {
        return new Response(
          JSON.stringify({
            code: 400,
            message: "当前模块正在使用中,无法删除",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }
      await process.env.DB
        .prepare(
          "DELETE FROM modules WHERE moduleid=? AND userid=?"
        )
        .bind(moduleid, userid).run()
      // 返回响应
      return new Response(
        JSON.stringify({
          code: 200,
          message: 'success',
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
