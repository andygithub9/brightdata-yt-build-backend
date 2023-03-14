import * as functions from "firebase-functions";
import { adminDb } from "./firebaseAdmin";
// import * as admin from "firebase-admin";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

const fetchResults: any = async (id: string) => {
  console.log("fetchResults executed...");
  const api_key = process.env.BRIGHTDATA_API_KEY;

  const res = await fetch(`https://api.brightdata.com/dca/dataset?id=${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${api_key}`,
    },
  });

  const data = await res.json();

  console.log(data);

  if (data.status === "building" || data.status === "collecting") {
    console.log("NOT COMPLETE YET, TRYING AGAIN...");
    return fetchResults(id);
  }

  return data;
};

export const onScraperComplete = functions.https.onRequest(
  async (request, response) => {
    console.log("SCRAPE COMPLETE >>> : ", request.body);

    const { success, id, finished } = request.body;

    if (!success) {
      // https://firebase.google.com/docs/firestore/manage-data/add-data#add_a_document
      await adminDb.collection("searches").doc(id).set(
        {
          status: "error",
          // 會出現錯誤 functions: TypeError: Cannot read properties of undefined (reading 'now') 原因不明
          // updatedAt: admin.firestore.Timestamp.now(),
          updatedAt: finished,
        },
        // https://firebase.google.com/docs/firestore/manage-data/add-data#set_a_document
        // 在 set 方法的第二個參數要記得加上 { merge: true }, 將新數據合併到現有文檔中, 否則已存在的文檔會被新數據覆寫
        {
          merge: true,
        }
      );
    }

    const data = await fetchResults(id);

    await adminDb.collection("searches").doc(id).set(
      {
        status: "complete",
        // 會出現錯誤 functions: TypeError: Cannot read properties of undefined (reading 'now') 原因不明
        // updatedAt: admin.firestore.Timestamp.now(),
        updatedAt: finished,
        results: data,
      },
      {
        merge: true,
      }
    );

    console.log("WOOHOO FULL CIRCLE!");

    response.send("Scraping Function Finished!");
  }
);
// 測試用 url: [ngrok 的網址]/[firebase functions 的網址]
// https://85cd-1-164-11-47.jp.ngrok.io/brightdata-yt-build-88684/us-central1/onScraperComplete

export const hello = functions.https.onRequest(async (req, res) => {
  res.json({ result: `hello` });
});
// 測試用 url: [ngrok 的網址]/[firebase functions 的網址]
// https://85cd-1-164-11-47.jp.ngrok.io/brightdata-yt-build-88684/us-central1/hello
