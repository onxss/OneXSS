// 导入所需的模块
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
            if (verifyResult.data.usertype !== 1) {
              return new Response(
                  JSON.stringify({
                      code: 403,
                      message: "权限不足",
                  }),
                  {
                      status: 403,
                      headers: {
                          "Content-Type": "application/json",
                      },
                  }
              );
          }

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
                    "SELECT users.userid, users.username, users.useremail, users.usertype, users.enabled, COUNT(projects.projectid) AS projectcount FROM users LEFT JOIN projects ON users.userid = projects.userid  GROUP BY users.userid, users.username, users.useremail, users.usertype, users.enabled LIMIT ? OFFSET ?"
                )
                .bind(pageSize, offset)
                .all()
                .then((query_result: any) => {
                    return query_result.results.map((row: any) => ({
                        userid: row.userid,
                        username: row.username,
                        useremail: row.useremail,
                        usertype: row.usertype,
                        enabled: row.enabled,
                        projectcount: row.projectcount
                    }));
                });

            const count_result = await process.env.DB.prepare(
                "SELECT count(*) as total FROM users"
            ).first().then((query_result: any) => {
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
