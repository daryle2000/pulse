// JavaScript source code

function detectDeviceType()
{
    if (navigator.userAgent.match(/iPad/i) == "iPad")
        return "ipad";
    else
        if (navigator.userAgent.match(/iPhone/i) == "iPhone")
            return "iphone";
        else
            if (navigator.userAgent.match(/Android/i) == "Android")
                return "android";
            else
                if (navigator.userAgent.match(/BlackBerry/i) == "BlackBerry")
                    return "blackBerry";
                else
                    return "undetected";
}
