import type { NextRequest } from "next/server";
import { passwordHash, verifyToken } from "../../../common/auth"

export const config = { runtime: "edge" };

export async function handle(req: NextRequest) {
    try {
        if (req.method === "POST") {
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

            const jsonData = await req.json();
            const username = jsonData.username;
            const useremail = jsonData.useremail;
            const usertype = jsonData.usertype;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            // 用户名校验
            if (username == undefined || username == null || username.length < 4) {
                return new Response(
                    JSON.stringify({
                        code: 400,
                        message: "用户名格式错误"
                    }),
                    {
                        status: 400,
                    }
                );
            }
            // 邮箱校验
            if (!useremail.match(emailRegex)) {
                return new Response(
                    JSON.stringify({
                        code: 400,
                        message: "邮箱格式错误"
                    }),
                    {
                        status: 400,
                    }
                );
            }
            // 密码
            if (jsonData.password == undefined || jsonData.password == null || jsonData.password.length < 8) {
                return new Response(
                    JSON.stringify({
                        code: 400,
                        message: "密码格式错误"
                    }),
                    {
                        status: 400,
                    }
                );
            }
            const password = await passwordHash(jsonData.password);

            // 校验用户名是否存在
            const result_username_count = await process.env.DB.prepare(
                "SELECT count(userid) AS count FROM users WHERE username=?"
            ).bind(username).first().then((query_result: any) => {
                return query_result.count
            });
            if (result_username_count > 0) {
                return new Response(
                    JSON.stringify({
                        code: 400,
                        message: "用户名已存在"
                    }),
                    {
                        status: 400,
                    }
                );
            }

            //开始插入用户表
            const insert_user_status = await process.env.DB.prepare(`INSERT INTO users (userid,username,password,useremail,usertype,enabled) VALUES((SELECT COALESCE(MAX(userid), 0) + 1 FROM users),?,?,?,?,1);`)
                .bind(username, password, useremail, usertype ? 1 : 0)
                .run().then((query_result: any) => {
                    if (query_result.success) {
                        return 1;
                    } else {
                        return -1;
                    }
                });
            if (insert_user_status != 1) {
                return new Response(
                    JSON.stringify({
                        code: 400,
                        message: "用户添加失败"
                    }),
                    {
                        status: 400,
                    }
                );
            }

            return new Response(
                JSON.stringify({
                    code: 200,
                    message: "添加用户成功"
                }),
                {
                    status: 200,
                }
            );
        }else{
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
    }
    catch (e: any) {
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

export default handle;