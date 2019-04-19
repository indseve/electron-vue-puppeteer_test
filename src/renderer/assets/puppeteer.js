import puppeteer from 'puppeteer';
import fs from 'fs';
//import { Date } from 'core-js';

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

const devices = require('puppeteer/DeviceDescriptors');
const iPhone = devices['iPhone X'];
var constBrowser;
const successCode = '10001'

function promisify(fn, callbackErr = true, reverse = false) {
  if ({}.toString.call(fn) !== '[object Function]') throw new TypeError('Only normal function can be promisified');
  return function (...args) {
    return new Promise((resolve, reject) => {
      const callback = function (...args) {
        if (!callbackErr) {
          if (args.length === 1) return resolve(args[0]);
          return resolve(args);
        }
        const err = args.shift();
        const rest = args;
        if ({}.toString.call(err) === '[object Error]') return reject(err);
        if (rest.length === 1) return resolve(rest[0]);
        return resolve(rest);
      };
      try {
        if (reverse === true) fn.apply(null, [callback, ...args]);
        else fn.apply(null, [...args, callback]);
      } catch (err) {
        reject(err);
      }
    });
  }
}

function sleep(delay) { //延时函数
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(1)
      } catch (e) {
        reject(0)
      }
    }, delay)
  })
}

async function addCookies(cookies_str, page, domain) {
  let cookies = cookies_str.split(';').map(pair => {
    let name = pair.trim().slice(0, pair.trim().indexOf('='))
    let value = pair.trim().slice(pair.trim().indexOf('=') + 1)
    return { name, value, domain }
  });
  //console.log(cookies);
  await Promise.all(cookies.map(pair => {
    return page.setCookie(pair)
  }))
}

async function init() {
  constBrowser = await puppeteer.launch({
    // 若是手动下载的chromium需要指定chromium地址, 默认引用地址为 /项目目录/node_modules/puppeteer/.local-chromium/
    executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    defaultViewport:{
      width:375,
      height:712,
      deviceScaleFactor:1,
      isMobile:true,
      hasTouch:true
    },
    //设置超时时间
    timeout: 15000,
    //如果是访问https页面 此属性会忽略https
    ignoreHTTPSErrors: true,
    // 打开开发者工具, 当此值为true时, headless总为false
    devtools: true,
    // 关闭headless模式, 不会打开浏览器
    headless: false
  });
}

async function login(username, img, data) {  
  let cookies = await CheckCookie(username,img);
  let page = await constBrowser.newPage();
  //await page.emulate(iPhone);
  await page.setUserAgent('Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36')
  cookies.forEach(async el => {
    await page.setCookie(el)
  });
  // try {
  //   data.shopList = await GetBuyItems(page);
  // } catch (error) {
  //   await page.close();
  //   return error;
  // }
  await BuyItem(page);
  
  return true;
}

async function GetBuyItems(page) {
  try {
    await page.goto('https://h5.m.taobao.com/mlapp/cart.html');
    await page.waitForSelector('.invalid-holder');
    await ScrollScreen(page,'#bundlev2_invalid > div.invalid-holder > div.invalid-btn')
  } catch (error) {
    console.log(error);
    throw error;
  }  
  let buyList = await page.$$('[data-spm="bundlev2"]');
  let shopList = await Promise.all(buyList.map(async (el) => {
    return {
      name: await el.$eval('div.shop > div > div > div.contact > a > p.title', e => e.innerText),
      items: await el.$$eval('.item-detail>div', div => div.map(element => {
          return {
            name: element.childNodes[1].childNodes[0].children[0].innerText,
            img: element.children[0].children[0].children[0].src
          }
        })
      )
    }
  }))
  return shopList
}

async function GetNewCookie(username, img) {
  let page = await constBrowser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36')
  await page.goto('https://login.taobao.com/');
  await page.evaluate('() =>{ Object.defineProperties(navigator,{ webdriver:{ get: () => false } }) }')
  await page.evaluate('() =>{ window.navigator.chrome = { runtime: {},  }; }')
  await page.evaluate("() =>{ Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] }); }")
  await page.evaluate("() =>{ Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5,6], }); }")
  await page.waitForSelector('#J_QRCodeImg > img')
  let QRCode = '666'

  while (QRCode != successCode && QRCode != 0) {
    switch (QRCode) {
      case '666': {
        img.stateTip = '请扫描二维码'
        img.src = await page.$eval('#J_QRCodeImg > img', img => img.src); //在第一次循环中显示二维码，防止太快扫码，程序来不及监听响应
        QRCode = '10000'
      }break;
      case '10000': {
        await page.waitForResponse(async res => {
          if (res.url().match('https://qrlogin.taobao.com/qrcodelogin/qrcodeLoginCheck.do')) {
            let fn = await res.text()
            try {
              QRCode = JSON.parse(fn.match(/\{"code":.*,"message":.*,"success":.*e\}/)).code.toString()
            } catch (error) {
              QRCode = '10000'
            }
          }
        }, 0)
      }break;
      case successCode: {
        img.src = null;
        img.stateTip = '登录成功';
      } break
      case '10004': { //二维码过期,自动刷新
        console.log(QRCode);
        await page.waitForSelector('#J_QRCodeLogin > div.qrcode-mod > div.qrcode-main > div.msg-err > a')
        await page.click('#J_QRCodeLogin > div.qrcode-mod > div.qrcode-main > div.msg-err > a')
        await page.waitFor(1000)
        img.src = await page.$eval('#J_QRCodeImg > img', img => img.src);
      } break;
      default: {
        img.stateTip = '登录失败'
        console.log(QRCode, 'failure');
        QRCode = 0;
      } break;
    }
  }

  console.log('OK!');
  
  await page.waitForNavigation({
    waitUntil: 'load'
  }, 0);

  let taobaoCookie = await page.cookies()
  try {
    await writeFile(`d:${username}.json`, JSON.stringify(taobaoCookie), 'UTF-8')
    console.log('保存成功');
    page.deleteCookie();
    await page.close()
  } catch (error) {
    console.log(error);
  }

  return taobaoCookie;
}

async function ReadCookie(username) {
  let cookies = false;
  try {
    let time = fs.statSync(`d:${username}.json`).mtime
    let now = new Date()
    if ((now - time) > 1000 * 60 * 60 * 8)
      return false
  } catch (error) {
    console.log(error);    
    return false
  }
  try {
    cookies = await readFile(`d:${username}.json`, 'utf8')
    if (cookies == '') 
      return false
  } catch (error) {
    console.log(error);    
    return false
  }
  try {
    cookies = JSON.parse(cookies);
  } catch (error) {
    console.log(error);    
    return false
  }
  return cookies
}

async function CheckCookie(username, img) {
  let cookies = await ReadCookie(username);
  if (cookies == false) {
    cookies = await GetNewCookie(username, img)
    return cookies
  }
  return cookies
}

async function ScrollScreen(page,dom) {
  let max_height_px = 1000
  try {
    if (typeof(dom) == 'number') {
      max_height_px = dom;      
    } else {
      max_height_px = await page.$eval(dom,el=>el.offsetTop);
    }
  } catch (error) {
    max_height_px = 10000
  }  
  let scrollStep = 812; // 滚动高度
  let height_limit = false;
  let mValues = { 'scrollEnable': true, 'height_limit': height_limit };
  while (mValues.scrollEnable) {
    mValues = await page.evaluate((scrollStep, max_height_px, height_limit) => {
      if (document.scrollingElement) {
        let scrollTop = document.scrollingElement.scrollTop;
        document.scrollingElement.scrollTop = scrollTop + scrollStep;
        if (null != document.body && document.body.clientHeight > max_height_px) {// 防止网页没有body时，滚动报错
          height_limit = true;
        }
        else if (document.scrollingElement.scrollTop + scrollStep > max_height_px) {
          height_limit = true;
        }
        let scrollEnableFlag = false;
        if (null != document.body) {
          scrollEnableFlag = document.body.clientHeight < scrollTop + scrollStep+1 && !height_limit;
        }
        else {
          scrollEnableFlag = document.scrollingElement.scrollTop + scrollStep > scrollTop + scrollStep+1 && !height_limit;
        }
        return {
          'scrollEnable': scrollEnableFlag,
          'height_limit': height_limit,
          'document_scrolling_Element_scrollTop': document.scrollingElement.scrollTop
        };
      }
    }, scrollStep, max_height_px, height_limit); await sleep(100);
  }
}

async function BuyItem(page) {
  let flag = true;
  //await page.goto('https://detail.m.tmall.com/item.htm?id=591413458930&spm=a310v.4.88.1&skuId=4231413367552')
  await page.goto('https://detail.m.tmall.com/item.htm?id=590914263674&spm=a21202.11768517.tborderdetaiitem_1.i2&skuId=4218149842968'+'&decision=buy')
  // while (flag) {
  //   try {
  //     await page.waitForSelector('#s-actionBar-container > div > div.trade > a.buy',{
  //       timeout: 2000
  //     })
  //     flag = false
  //   } catch (error) {
  //     flag = true;
  //     await page.reload()
  //   }
  // } 
  // await page.click('#s-actionBar-container > div > div.trade > a.buy')
  //await ScrollScreen(page,1000)
  try {
    await page.waitForSelector('body > div.widgets-cover.show > div.cover-content > div > div.footer.trade > a',{
      visible: true,
      timeout : 2000
    })
  } catch (error) {
    console.log(error);    
  }
  
  await page.click('body > div.widgets-cover.show > div.cover-content > div > div.footer.trade > a',{
    delay:1000
  })
  try {
    await page.waitForSelector('#submitOrder_1 > div.mui-flex.align-center > div.cell.fixed.action > div',{
      timeout:1000
    })
  } catch (error) {
    await page.click('body > div.widgets-cover.show > div.cover-content > div > div.footer.trade > a',{
      delay:1000
    })
  }
  // await page.click('#submitOrder_1 > div.mui-flex.align-center > div.cell.fixed.action > div')
  // await page.waitFor(2000)
  // await page.close()
}

function changedata(data) {
  data.username = '第一轮'
}

export { login, changedata, init }
