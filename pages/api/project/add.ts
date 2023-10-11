// 导入所需的模块
import { NextRequest } from "next/server";
import { verifyToken } from "../../../common/auth";
import { const_projectcode_prefix, const_projectcode_suffix } from "../../../common/jscode";

export const config = { runtime: "edge" };

// 处理 POST 请求的处理程序
export default async function handler(req: NextRequest) {
  try {
    if (req.method === "POST") {
      // 从请求中获取 JSON 数据
      const _cookie_token = req.cookies.get('token')?.value;
      const verifyResult = await verifyToken(_cookie_token);
      if (verifyResult.code != 200) {
        return verifyResult.data;
      }
      const userid = verifyResult.data.userid;
      const jsonData = await req.json();
      const { projectname, projectdescription, module_id_list, telegram_notice_enable, telegram_notice_token, telegram_notice_chatid } = jsonData;

      if (projectname == undefined || projectdescription == undefined || module_id_list == undefined) {
        return new Response(
          JSON.stringify({
            code: 400,
            message: "参数错误"
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }
      let telegram_notice_token_real = '';
      let telegram_notice_chatid_real = '';
      let telegram_notice_enable_real = 0;
      if (telegram_notice_enable) {
        telegram_notice_enable_real = 1
        telegram_notice_token_real = telegram_notice_token != undefined ? telegram_notice_token : '';
        telegram_notice_chatid_real = telegram_notice_chatid != undefined ? telegram_notice_chatid : '';
      }
      // moduleid从前端获取后校验数字
      // moduleid从数据库中获取代码
      let projectcode_prefix = const_projectcode_prefix;
      let projectcode_suffix = const_projectcode_suffix;
      let projectcode_function_run = "";
      let real_module_id_list: number[] = [];
      let real_module_args_list: number[] = [];

      for (const key in Array.from(new Set(module_id_list))) {
        await process.env.DB.prepare("SELECT * FROM modules WHERE moduleid=? AND (userid=? OR moduletype=1)")
          .bind(parseInt(module_id_list[key]), userid).first()
          .then((query_result: any) => {
            if (query_result.module_extra_enable == true) {
              projectcode_prefix += query_result.modulecontent + `\n`;
              projectcode_function_run += `\ntry{probe_return_data['${query_result.module_extra_argname}'] = ${query_result.module_extra_func_name}();}catch (e) {probe_return_data['${query_result.module_extra_argname}'] = '';}\n`;
              real_module_id_list.push(query_result.moduleid);
              real_module_args_list.push(query_result.module_extra_argname);
            } else if (query_result.module_extra_enable == false) {
              projectcode_prefix += query_result.modulecontent;
              real_module_id_list.push(query_result.moduleid);
            }
          });
      }
      

      const sql = `INSERT INTO projects(projectid,projectname,projectdescription,projecturl,telegram_notice_enable,telegram_notice_token,telegram_notice_chatid,userid) 
          VALUES(
            (SELECT COALESCE(MAX(projectid)+1, 1) FROM projects),
            ?,
            ?,
            (SELECT SUBSTR(REPLACE(LOWER(HEX(RANDOMBLOB(2))), '00', ''), 1, 4) AS generated_char FROM (SELECT 1) AS dummy LEFT JOIN projects ON 1=1 WHERE generated_char NOT IN (SELECT SUBSTR(projecturl, 1, 4) FROM projects)  OR projecturl IS NULL LIMIT 1),
            ?,
            ?,
            ?,
            ?)`;
      const insertedProjectId = await process.env.DB.prepare(sql)
        .bind(projectname,
          projectdescription,
          telegram_notice_enable_real,
          telegram_notice_token_real,
          telegram_notice_chatid_real,
          userid
        ).run().then((insert_result: any) => {
          if (insert_result.success) {
            return insert_result.meta.last_row_id;
          } else {
            return -1;
          }
        });

      if (insertedProjectId > 0) {
        // 获取API域名
        const API_DOMAIN = await process.env.DB.prepare(`SELECT configvalue FROM config WHERE configname = 'domain'`).first().then(
          (query_result: any) => {
            return query_result.configvalue;
          }
        );
        // 查询新添加的项目url
        const projecturl = await process.env.DB.prepare(`SELECT projecturl FROM projects WHERE projectid = ? AND userid = ?`)
              .bind(insertedProjectId, userid).first().then((query_result: any) => {
          return query_result.projecturl;
        })
        // 拼接回传数据URL
        const callbackURL = "https://" + API_DOMAIN + "/" + projecturl;
        // 替换js中的回传URL
        const projectcode = projectcode_prefix.replaceAll("{__backend_api_url}",callbackURL) + 
              `async function platform_run_main(){\n${projectcode_function_run}\nplatform_send_data(probe_return_data);\n}\n` + 
              projectcode_suffix;
        await process.env.DB.prepare(`UPDATE projects SET projectcode = ? WHERE projectid = ?`)
            .bind(projectcode,insertedProjectId).run();
        // 添加moduleid与projectid映射到project_modules表
        for (const moduleid of real_module_id_list) {
          const insertModuleQuery = await process.env.DB.prepare(
            "INSERT INTO project_modules(moduleid, projectid) VALUES (?, ?)"
          ).bind(moduleid, insertedProjectId).run();
        }

        // 清除可能存在的KV缓存
        await process.env.JSKV.delete(`project:${projecturl}`);
        // 返回响应
        return new Response(
          JSON.stringify({
            code: 200,
            message: "插入完成"
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }
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
