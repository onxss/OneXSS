// 导入所需的模块
import { NextRequest } from "next/server";
import { verifyToken } from "../../common/auth";

export const config = { runtime: "edge" };

export default async function handler(req: NextRequest) {
    try {
        const _cookie_token = req.cookies.get('token')?.value;
        const verifyResult = await verifyToken(_cookie_token);
        if (verifyResult.code !== 200) {
            return verifyResult.data;
        }
        const userid = verifyResult.data.userid;

        const action = req.nextUrl.searchParams.get("action");
        if (req.method === "GET" && action === "list") {
            // 从请求中获取 JSON 数据
            const _pageSize = req.nextUrl.searchParams.get("pageSize");
            const _current = req.nextUrl.searchParams.get("current");
            const _projectid = req.nextUrl.searchParams.get("projectid");
            const _ip = req.nextUrl.searchParams.get("ip");
            const _domain = req.nextUrl.searchParams.get("domain");
            if (_pageSize == undefined || _current == undefined || _projectid == undefined) {
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
            const projectid = parseInt(_projectid);
            // 计算偏移量
            const offset = (current - 1) * pageSize;

            let sqlbind_data = null;
            let sqlbind_count = null;
            if (_ip != null && _domain == null) { // 传入IP 未传入域名
                sqlbind_data = process.env.DB
                    .prepare(
                        "SELECT * FROM accesslog WHERE ip = ? AND projecturl IN (SELECT projecturl FROM projects WHERE projectid = ? AND userid = ? ) ORDER BY requestdate DESC LIMIT ? OFFSET ?"
                    )
                    .bind(_ip, projectid, userid, pageSize, offset);
                sqlbind_count = process.env.DB.prepare(
                    "SELECT count(*) AS total FROM accesslog WHERE ip = ? AND projecturl IN (SELECT projecturl FROM projects WHERE projectid = ? AND userid = ? )"
                ).bind(_ip, projectid, userid);
            } else if (_domain != null && _ip == null) { //传入域名 未传入IP
                sqlbind_data = process.env.DB
                    .prepare(
                        "SELECT * FROM accesslog WHERE domain = ? AND projecturl IN (SELECT projecturl FROM projects WHERE projectid = ? AND userid = ? ) ORDER BY requestdate DESC LIMIT ? OFFSET ?"
                    )
                    .bind(_domain, projectid, userid, pageSize, offset);
                sqlbind_count = process.env.DB.prepare(
                    "SELECT count(*) AS total FROM accesslog WHERE domain = ? AND projecturl IN (SELECT projecturl FROM projects WHERE projectid = ? AND userid = ? )"
                ).bind(_domain, projectid, userid);
            } else if (_domain != null && _ip != null) { // 传入域名 传入IP
                sqlbind_data = process.env.DB
                    .prepare(
                        "SELECT * FROM accesslog WHERE domain = ? AND ip = ? AND projecturl IN (SELECT projecturl FROM projects WHERE projectid = ? AND userid = ? ) ORDER BY requestdate DESC LIMIT ? OFFSET ?"
                    )
                    .bind(_domain, _ip, projectid, userid, pageSize, offset);
                sqlbind_count = process.env.DB.prepare(
                    "SELECT count(*) AS total FROM accesslog WHERE domain = ? AND ip = ? AND projecturl IN (SELECT projecturl FROM projects WHERE projectid = ? AND userid = ? )"
                ).bind(_domain, _ip, projectid, userid);
            } else {  //无查询条件
                sqlbind_data = process.env.DB
                    .prepare(
                        "SELECT * FROM accesslog WHERE projecturl IN (SELECT projecturl FROM projects WHERE projectid = ? AND userid = ? ) ORDER BY requestdate DESC LIMIT ? OFFSET ?"
                    )
                    .bind(projectid, userid, pageSize, offset);
                sqlbind_count = process.env.DB.prepare(
                    "SELECT count(*) AS total FROM accesslog WHERE projecturl IN (SELECT projecturl FROM projects WHERE projectid = ? AND userid = ? )"
                ).bind(projectid, userid)
            }

            // 实现分页查询
            const result = await sqlbind_data.all()
                .then((query_result: any) => {
                    return query_result.results.map((row: any) => ({
                        id: row.id,
                        projecturl: row.projecturl,
                        country: row.country,
                        region: row.region,
                        city: row.city,
                        isp: row.isp,
                        location: `${row.latitude},${row.longitude}`,
                        referer: row.referer,
                        domain: row.domain,
                        ip: row.ip,
                        useragent: row.useragent,
                        requestdate: row.requestdate,
                        ...JSON.parse(row.otherdata)
                    }));
                });

            const count_result = await sqlbind_count
                .first().then((query_result: any) => {
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
        }
        else if (req.method === "GET" && action === "init") {
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

            // 根据 moduleid 查询模块信息
            const result = await process.env.DB
                .prepare(
                    "SELECT projects.projectname,projects.projecturl,modules.module_extra_argname,modules.module_extra_column_name FROM projects LEFT JOIN project_modules ON projects.projectid = project_modules.projectid LEFT JOIN modules ON project_modules.moduleid = modules.moduleid WHERE projects.projectid = ? AND projects.userid =?"
                )
                .bind(projectid, userid)
                .all().then((query_result: any) => {
                    return query_result.results.map((row: any) => ({
                        projectname: row.projectname,
                        projecturl: row.projecturl,
                        module_extra_argname: row.module_extra_argname,
                        module_extra_column_name: row.module_extra_column_name
                    }));
                });
            if (result === null || result === undefined || result.length === 0) {
                return new Response(
                    JSON.stringify({
                        code: 400,
                        message: "未找到项目信息",
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
            }
            // 定义日志表头,初始化基础信息
            let columns: Array<{ title: string, dataIndex: string, key: string }> = [
                {
                    title: '域名',
                    dataIndex: 'domain',
                    key: 'domain',
                }
                ,
            ];
            let projectname = '';
            let projecturl = '';
            result.forEach((item: any) => {
                if (item.module_extra_column_name != null && item.module_extra_argname != null)
                    columns.push({
                        title: item.module_extra_column_name,
                        dataIndex: item.module_extra_argname,
                        key: item.module_extra_argname,
                    });
                projecturl = item.projecturl;
                projectname = item.projectname;
            });

            // 获取项目中已存在的domain列表,用于前端下拉搜索框
            let domain_list: { [key: number]: { text: string } } = {};
            const domain_result = await process.env.DB
                .prepare(
                    "SELECT domain,count(*) AS count FROM accesslog WHERE projecturl = ? GROUP BY domain ORDER BY count"
                )
                .bind(projecturl)
                .all().then((query_result: any) => {
                    return query_result.results.map((row: any) => ({
                        text: row.domain
                    }));
                });
            domain_result.forEach((item: any, index: string) => {
                if (item.text == '') { // 空域名情况,解决前端异常
                    domain_list[item.text] = { "text": "空域名" };
                }
                else {
                    domain_list[item.text] = item;
                }
            });
            // 获取项目domain列表完毕.

            // 返回模块信息
            return new Response(
                JSON.stringify({
                    code: 200,
                    message: "success",
                    data: {
                        projectname: projectname,
                        columns: columns,
                        domain_list: domain_list
                    },
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
        }
        else if (req.method === "POST" && action === "delete") {
            const jsonData = await req.json();
            const { keys } = jsonData;
            if (!keys || keys == undefined) {
                return new Response(
                    JSON.stringify({
                        code: 400,
                        message: "缺少必要参数"
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );
            }
            for(const key of keys){
                const result = await process.env.DB.prepare("DELETE FROM accesslog WHERE id = ? AND projecturl IN (SELECT projecturl FROM projects WHERE userid = ? )")
                    .bind(key, userid).run();
            };

            // 返回响应
            return new Response(
                JSON.stringify({
                    message: "ok",
                    code: 200
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
