export const const_projectcode_prefix = `probe_return_data = {};
function platform_send_data(data) {
    var http = new XMLHttpRequest();
    var url = "{__backend_api_url}";
    http.open("POST", url, true);
    http.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    http.onreadystatechange = function () {
        if (http.readyState == 4 && http.status == 200) {
        }
    }
    http.send(JSON.stringify(data));
}
function addEvent(element, eventName, fn) {
    if (element.addEventListener)
        element.addEventListener(eventName, fn, false);
    else if (element.attachEvent)
        element.attachEvent('on' + eventName, fn);
}
`;

export const const_projectcode_suffix = `
if (document.readyState == "complete") {
    platform_run_main();
} else {
    addEvent(window, "load", function() {
        platform_run_main();
    });
}
`;
