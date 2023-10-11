// 导入所需的模块
import { NextRequest } from "next/server";
import { verifyToken } from "../../../common/auth";

export const config = { runtime: "edge" };

function argsCheck(text: string) {
  const argspattern = /^[a-zA-Z][a-zA-Z0-9_-]+$/;
  if (!argspattern.test(text)) {
    return true;
  }
  const keywords = [
    'id',
    'projecturl',
    'country',
    'region',
    'city',
    'isp',
    'latitude',
    'longitude',
    'referer',
    'domain',
    'ip',
    'useragent',
    'requestdate',
    'otherdata'
  ];
  let keywords_match_flag: boolean = false;
  keywords.forEach((keyword: string) => {
    if (text.toLowerCase() == keyword) {
      keywords_match_flag = true;
    }
  })
  return keywords_match_flag; //匹配到为true
}

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
      const usertype = verifyResult.data.usertype;

      const jsonData = await req.json();
      const { modulename, moduledescription, moduletype, modulecontent, module_extra_enable, module_extra_argname, module_extra_column_name, module_extra_func_name } = jsonData;
      if (!modulename || !moduledescription || moduletype == undefined || !modulecontent || (module_extra_enable == 1 && (!module_extra_argname || !module_extra_column_name || !module_extra_func_name))) {
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
      const name_pattern = /^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/;
      const funcname_pattern =  /^[a-zA-Z0-9_\s-]+$/;
      if (!name_pattern.test(modulename) || 
        (module_extra_enable && argsCheck(module_extra_argname)) || 
        (module_extra_enable && !name_pattern.test(module_extra_column_name)) || 
        (module_extra_enable && !funcname_pattern.test(module_extra_func_name))) {
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
      const sql = `INSERT INTO modules(moduleid,modulename,moduledescription,moduletype,modulecontent,module_extra_enable,module_extra_argname,module_extra_column_name,module_extra_func_name,userid) VALUES((SELECT COALESCE(MAX(moduleid)+1, 1) FROM modules),?,?,?,?,?,?,?,?,?)`;
      const result = await process.env.DB.prepare(sql)
        .bind(modulename, moduledescription, moduletype == 1 && usertype == 1 ? 1 : 0, modulecontent, module_extra_enable ? 1 : 0, module_extra_argname ? module_extra_argname : null, module_extra_column_name ? module_extra_column_name : null, module_extra_func_name ? module_extra_func_name : null, userid).run();
      // 返回响应
      return new Response(
        JSON.stringify({
          result: result
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
        JSON.stringify({ code: 400, message: "服务器错误" }),
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
