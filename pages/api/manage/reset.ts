// 导入所需的模块
import { NextRequest } from "next/server";
import { passwordHash, verifyToken } from "../../../common/auth";

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
            if (verifyResult.code !== 200) {
                return verifyResult.data;
            }
            const userid = verifyResult.data.userid;
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

            const _userid = req.nextUrl.searchParams.get("userid");
            if (_userid == undefined) {
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
            const reset_userid = parseInt(_userid);
            if (userid == reset_userid) {
                return new Response(
                    JSON.stringify({
                        code: 400,
                        message: "不能重置本用户",
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
            }
            const new_password_plain = generateRandomString(16);
            const new_password = await passwordHash(new_password_plain);
            await process.env.DB
                .prepare(
                    "UPDATE users SET password = ? WHERE userid=?"
                )
                .bind(new_password, reset_userid).run();
            await process.env.JSKV.delete(`token:${reset_userid}`);
            // 返回响应
            return new Response(
                JSON.stringify({
                    code: 200,
                    message: 'success',
                    data: { "new_password": new_password_plain }
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
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
