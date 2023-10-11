// 导入所需的模块
import { NextRequest } from "next/server";
import { verifyToken } from "../../../common/auth";

export const config = { runtime: "edge" };

async function getObfuscateCode(code: string) {
    const apiUrl = 'https://node.shield.bytehide.com/obfuscate';
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
    });
    if (response.ok) {
        return (await response.json()).output;
    } else {
        return "";
    }

}

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

            const _projectid = req.nextUrl.searchParams.get("projectid");
            if (_projectid == undefined) {
                return new Response(
                    JSON.stringify({
                        code: 401,
                        message: "参数错误",
                    }),
                    {
                        status: 401,
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
            }
            const projectid = parseInt(_projectid);

            const project_result = await process.env.DB
                .prepare(
                    "SELECT projecturl,projectcode,obfuscate_enable FROM projects WHERE projectid=? AND userid=?"
                )
                .bind(projectid, userid)
                .first().then((query_result: any) => {
                    return {
                        projecturl: query_result.projecturl,
                        projectcode: query_result.projectcode,
                        obfuscate_enable: query_result.obfuscate_enable,
                    }
                });
            if (project_result.obfuscate_enable == 1) {
                // 禁用操作
                await process.env.DB.prepare("UPDATE projects SET obfuscate_enable=0, obfuscate_code='' WHERE projectid = ? AND userid = ?")
                    .bind(projectid, userid).run();
            } else if (project_result.obfuscate_enable == 0) {
                // 启用操作
                const obfuscate_code = await getObfuscateCode(project_result.projectcode);
                if (obfuscate_code == '') {
                    return new Response(
                        JSON.stringify({
                            code: 500,
                            message: "混淆接口错误",
                        }),
                        {
                            status: 500,
                            headers: {
                                "Content-Type": "application/json",
                            },
                        }
                    );
                }
                else {
                    await process.env.DB.prepare("UPDATE projects SET obfuscate_enable = 1, obfuscate_code = ? WHERE projectid = ? AND userid = ?")
                        .bind(obfuscate_code, projectid, userid).run();
                }
            }
            await process.env.JSKV.delete(`project:${project_result.projecturl}`);
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
