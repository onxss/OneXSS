import { NextRequest } from "next/server";
import { verifyToken } from "../../../common/auth";

export const config = { runtime: "edge" };

export default async function handler(req: NextRequest) {
  try {


    if (req.method === "GET") {
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

      // 根据 moduleid 查询模块信息
      const result = await process.env.DB
        .prepare(
          "SELECT moduleid, modulename,moduledescription,moduletype, modulecontent, module_extra_enable, module_extra_argname, module_extra_column_name,module_extra_func_name FROM modules WHERE moduleid=? AND (userid=? OR moduletype=1)"
        )
        .bind(moduleid, userid)
        .first();

      if (!result) {
        return new Response(
          JSON.stringify({
            code: 400,
            message: "未找到该模块",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      // 返回模块信息
      return new Response(
        JSON.stringify({
          code: 200,
          message: "success",
          data: result,
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
