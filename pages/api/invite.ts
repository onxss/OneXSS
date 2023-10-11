// 导入所需的模块
import { NextRequest } from "next/server";
import { verifyToken } from "../../common/auth";

export const config = { runtime: "edge" };

function generateRandomString(length: number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charactersLength);
        result += characters.charAt(randomIndex);
    }

    return result;
}

export default async function handler(req: NextRequest) {
    try {
        if (req.method === "GET") {
            const _cookie_token = req.cookies.get('token')?.value;
            const verifyResult = await verifyToken(_cookie_token);
            if (verifyResult.code != 200) {
                return verifyResult.data;
            }
            const userid = verifyResult.data.userid;
            const action = req.nextUrl.searchParams.get("action");

            // 添加邀请码
            if (action === "add") {
                const randomString = generateRandomString(16);
                while (true) {
                    const checkUniq = await process.env.DB.prepare(`SELECT count(*) AS count FROM invites WHERE invitecode = ?`).bind(randomString).first().then(
                        (query_result: any) => {
                            return query_result.count;
                        }
                    );
                    if (checkUniq == 0) {
                        break;
                    }
                }
                await process.env.DB.prepare(`INSERT INTO invites (invitecode,create_userid) VALUES (?,?)`).bind(randomString, userid).run();
                // 返回响应
                return new Response(
                    JSON.stringify({
                        code: 200,
                        message: "success",
                        data: { "invitecode": randomString },
                    }),
                    {
                        status: 200,
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
            }
            else if (action === "delete") {
                const _invitecode = req.nextUrl.searchParams.get("invitecode");
                if (_invitecode == undefined) {
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
                const result = await process.env.DB.prepare(`DELETE FROM invites WHERE is_used = 0 AND invitecode = ? AND create_userid = ?`).bind(_invitecode, userid).run();
                // 返回响应
                return new Response(
                    JSON.stringify({
                        code: 200,
                        message: "success",
                    }),
                    {
                        status: 200,
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
            }
            else if (action == "list") {
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
                        "SELECT invites.invitecode AS invitecode, invites.is_used AS is_used, IFNULL(users.username, '') AS signup_username FROM invites LEFT JOIN users ON invites.signup_userid = users.userid WHERE invites.create_userid = ? LIMIT ? OFFSET ?"
                    )
                    .bind(userid, pageSize, offset)
                    .all()
                    .then((query_result: any) => {
                        return query_result.results.map((row: any) => ({
                            invitecode: row.invitecode,
                            is_used: row.is_used,
                            username: row.signup_username,
                        }));
                    });

                const count_result = await process.env.DB.prepare(
                    "SELECT count(*) AS total FROM invites WHERE create_userid=?"
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
