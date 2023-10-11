// 导入所需的模块
import { NextRequest } from "next/server";
import { isPasswordValid, passwordHash, verifyToken, signToken } from "../../common/auth";

export const config = { runtime: "edge" };

// 处理 POST 请求的处理程序
export default async function handler(req: NextRequest) {
    try {
        const action = req.nextUrl.searchParams.get("action");
        if (req.method === "POST" && action === "signin") {
            const jsonData = await req.json();
            const username = jsonData.username;
            const password = await passwordHash(jsonData.password);
            const result = await process.env.DB.prepare(
                "SELECT * FROM users WHERE username=? AND password=? AND enabled=1"
            ).bind(username, password).first().then((query_result: any) => {
                if (query_result == null) {
                    return;
                }
                return {
                    userid: query_result.userid,
                    username: query_result.username,
                    useremail: query_result.useremail,
                    usertype: query_result.usertype,
                    expiretime: Date.now() + 43200000
                }
            });
            // 验证账号密码失败 返回401
            if (result == null || result === undefined) {
                let response_header = new Headers();
                {
                    response_header.append("Content-Type", "application/json");
                    response_header.append("Set-Cookie", `token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; HttpOnly; SameSite=Strict; path=/;`);
                }
                return new Response(
                    JSON.stringify({
                        code: 400,
                        message: "用户名或密码错误"
                    }),
                    {
                        status: 400,
                        headers: response_header
                    }
                );
            }
            // 验证账号密码成功
            const token = await signToken(result.userid, result.username, result.useremail, result.usertype, result.expiretime);
            const expiretime = new Date(result.expiretime).toUTCString();;
            let response_header = new Headers();
            {
                response_header.append("Content-Type", "application/json");
                response_header.append("Set-Cookie", `token=${token}; expires=${expiretime}; HttpOnly; SameSite=Strict; path=/;`);
            }
            await process.env.JSKV.put(`token:${result.userid}`, JSON.stringify({
                'userid': result.userid,
                'useremail': result.useremail,
                'username': result.username,
                'usertype': result.usertype,
                'expiretime': result.expiretime,
                'token': token
            }),
                { expiration: result.expiretime / 1000 }
            )
            return new Response(
                JSON.stringify({
                    code: 200,
                    message: "登陆成功"
                }),
                {
                    status: 200,
                    headers: response_header
                }
            );
        }
        else if (req.method === "POST" && action === "signup") {
            const jsonData = await req.json();
            const username = jsonData.username;
            const invitecode = jsonData.invitecode;
            const useremail = jsonData.useremail;
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
            // 校验邀请码是否存在
            const result_invitecode_count = await process.env.DB.prepare("SELECT count(*) AS count FROM invites WHERE invitecode = ? AND is_used = 0")
                .bind(invitecode).first().then((query_result: any) => {
                    return query_result.count
                });
            if (result_invitecode_count < 1) {
                return new Response(
                    JSON.stringify({
                        code: 400,
                        message: "邀请码不存在或已使用"
                    }),
                    {
                        status: 400,
                    }
                );
            }

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
                        message: "用户名已存在或已禁用"
                    }),
                    {
                        status: 400,
                    }
                );
            }

            //开始插入用户表
            const insert_user_status = await process.env.DB.prepare(`INSERT INTO users (userid,username,password,useremail,usertype,enabled) VALUES((SELECT COALESCE(MAX(userid), 0) + 1 FROM users),?,?,?,0,1);`)
                .bind(username, password, useremail)
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
                        code: 500,
                        message: "用户添加失败"
                    }),
                    {
                        status: 500,
                    }
                );
            }
            const result = await process.env.DB.prepare(
                "SELECT * FROM users WHERE username=? AND password=? AND enabled=1"
            ).bind(username, password).first().then((query_result: any) => {
                return {
                    userid: query_result.userid,
                    username: query_result.username,
                    useremail: query_result.useremail,
                    usertype: query_result.usertype,
                    expiretime: Date.now() + 43200000
                }
            });
            const updateinvite = await process.env.DB.prepare(`UPDATE invites SET is_used=1 , signup_userid = ? WHERE invitecode = ? `).bind(result.userid, invitecode).run().then((update_result: any) => {
                if (update_result.success) {
                    return 1;
                } else {
                    return -1;
                }
            });
            // 验证账号密码成功
            const token = await signToken(result.userid, result.username, result.useremail, result.usertype, result.expiretime);
            const expiretime = new Date(result.expiretime).toUTCString();;
            let response_header = new Headers();
            {
                response_header.append("Content-Type", "application/json");
                response_header.append("Set-Cookie", `token=${token}; expires=${expiretime}; HttpOnly; SameSite=Strict; path=/;`);
            }
            await process.env.JSKV.put(`token:${result.userid}`, JSON.stringify({
                'userid': result.userid,
                'useremail': result.useremail,
                'username': result.username,
                'usertype': result.usertype,
                'expiretime': result.expiretime,
                'token': token
            }),
                { expiration: result.expiretime / 1000 }
            )
            return new Response(
                JSON.stringify({
                    code: 200,
                    message: "注册成功"
                }),
                {
                    status: 200,
                    headers: response_header
                }
            );

        }
        else if (action === "logout") {
            const _cookie_token = req.cookies.get('token')?.value;
            const verifyResult = await verifyToken(_cookie_token);
            if (verifyResult.code != 200) {
                return verifyResult.data;
            }
            const userid = verifyResult.data.userid;

            await process.env.JSKV.delete(`token:${userid}`);
            let response_header = new Headers();
            {
                response_header.append("Content-Type", "application/json");
                response_header.append("Set-Cookie", `token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; HttpOnly; SameSite=Strict; path=/;`);
            }
            return new Response(
                JSON.stringify({
                    code: 200,
                    message: "退出登陆成功"
                }),
                {
                    status: 200,
                    headers: response_header
                }
            );
        }
        else if (req.method === "POST" && action === "modify") {
            // 从请求中获取 JSON 数据
            const _cookie_token = req.cookies.get('token')?.value;
            const verifyResult = await verifyToken(_cookie_token);
            if (verifyResult.code != 200) {
                return verifyResult.data;
            }
            const userid = verifyResult.data.userid;
            const jsonData = await req.json();
            const { old_password, new_password, useremail } = jsonData;
            if (old_password == undefined || new_password == undefined || useremail == undefined) {
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

            const old_password_hash_input = await passwordHash(old_password);
            const old_password_hash_db = await process.env.DB.prepare("SELECT password FROM users WHERE userid = ?")
                .bind(userid).first().then((query_result: any) => {
                    return query_result.password;
                })
            if (old_password_hash_db != old_password_hash_input) {
                return new Response(
                    JSON.stringify({
                        code: 400,
                        message: "旧密码不匹配"
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
            }
            let last_row_id = -1;
            let response_header = new Headers();
            response_header.append("Content-Type", "application/json");
            if (isPasswordValid(new_password)) {
                const new_password_hash = await passwordHash(new_password);
                const sql = `UPDATE users SET password = ? , useremail = ? WHERE userid = ?`
                last_row_id = await process.env.DB.prepare(sql)
                    .bind(new_password_hash, useremail, userid).run().then((insert_result: any) => {
                        if (insert_result.success) {
                            return 1;
                        } else {
                            return -1;
                        }
                    });
                // 若进行了修改密码操作,则删除原有cookie和KV缓存
                await process.env.JSKV.delete(`token:${userid}`);
                response_header.append("Set-Cookie", `token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; HttpOnly; SameSite=Strict; path=/;`);
            } else {
                const sql = `UPDATE users SET useremail = ? WHERE userid = ?`
                last_row_id = await process.env.DB.prepare(sql)
                    .bind(useremail, userid).run().then((insert_result: any) => {
                        if (insert_result.success) {
                            return 1;
                        } else {
                            return -1;
                        }
                    });
            }

            if (last_row_id != -1) {
                // 返回响应
                return new Response(
                    JSON.stringify({
                        code: 200,
                        message: "编辑完成"
                    }),
                    {
                        status: 200,
                        headers: response_header
                    }
                );
            }
        } 
        else {
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
