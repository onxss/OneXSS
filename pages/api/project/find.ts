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

      const _projectid = req.nextUrl.searchParams.get("projectid");
      if (_projectid == undefined) {
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
      const projectid = parseInt(_projectid);

      const API_DOMAIN = await process.env.DB.prepare(`SELECT configvalue FROM config WHERE configname = 'domain'`).first().then(
        (query_result: any) => {
          return query_result.configvalue;
        }
      );

      let result = await process.env.DB
        .prepare(
          "SELECT * FROM projects WHERE projectid=? AND userid=?"
        )
        .bind(projectid, userid)
        .first().then((query_result: any) => {
          return {
            projectid: query_result.projectid,
            projectname: query_result.projectname,
            projectdescription: query_result.projectdescription,
            projectcode: query_result.projectcode,
            projecturl: API_DOMAIN + "/" + query_result.projecturl,
            telegram_notice_enable: query_result.telegram_notice_enable,
            telegram_notice_token: query_result.telegram_notice_token,
            telegram_notice_chatid: query_result.telegram_notice_chatid,
            userid: query_result.userid
          }
        });

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

      let module_list_result = await process.env.DB
        .prepare(
          "SELECT pm.moduleid, m.modulename FROM project_modules pm JOIN modules m ON pm.moduleid = m.moduleid WHERE pm.projectid = ?"
        ).bind(projectid).all().then((query_result: any) => {
          return query_result.results.map((row: any) => ({
            value: row.moduleid,
            label: row.modulename
          }));
        });
      // 返回模块信息
      return new Response(
        JSON.stringify({
          code: 200,
          message: "success",
          data: { ...result, module_id_list: module_list_result },
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
