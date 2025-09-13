import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import puppeteer from "puppeteer-core";
import chromium from "chrome-aws-lambda";

const app = express();
app.use(bodyParser.json());

app.post("/scrape", async (req,res)=>{
  const { url, sheetEndpoint } = req.body;
  if(!url || !sheetEndpoint) return res.status(400).send("Missing url or sheetEndpoint");

  try{
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const data = await page.evaluate(()=>{
      const league = document.querySelector(".match-info .league a")?.innerText || "Unknown League";
      const home = document.querySelector(".team-home .team-name")?.innerText || "Home";
      const away = document.querySelector(".team-away .team-name")?.innerText || "Away";
      const score = document.querySelector(".detail-score")?.innerText || "0-0";
      const minute = document.querySelector(".status")?.innerText || "0'";
      return { league, match: home + " vs " + away, score, minute, trigger:"", final:"", status:"", url: window.location.href };
    });

    await fetch(sheetEndpoint, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    await browser.close();
    res.json({status:"ok", data});

  } catch(err){
    res.status(500).json({status:"error", message: err.message});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Server running on port "+PORT));
