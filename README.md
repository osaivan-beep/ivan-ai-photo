
# Ivan AI Photo

## Deployment Setup (Firebase Hosting & Cloud Functions)

我們使用 **Firebase CLI** 與 **GitHub Actions** 進行安全部署。
本架構遵循「企業級安全實踐」，將 API Key 儲存在 Google Secret Manager，而非程式碼中。

### 🚨 部署錯誤排除 (Troubleshooting)

#### ⚠️ `Build failed: missing permission on the build service account` (Artifact Registry 錯誤)
如果您看到類似 `Failed to update function` 且錯誤代碼為 `3`，或者 `artifactregistry.repositories.downloadArtifacts` 權限不足：

**解決方案 (必須手動執行)：**
這是因為 Google Cloud Build 的 Service Account 缺少權限。

1.  前往 **[Google Cloud IAM 管理頁面](https://console.cloud.google.com/iam-admin/iam?project=ivan-ai-photo-web)**。
2.  勾選右側的「包含 Google 提供的角色授權 (Include Google-provided role grants)」。
3.  在列表中尋找包含 `cloudbuild.gserviceaccount.com` 的帳號 (通常是 `[project-number]@cloudbuild.gserviceaccount.com`)。
4.  點擊右側的 **編輯 (鉛筆圖示)**。
5.  新增以下 **兩個** 角色：
    *   **Artifact Registry Administrator** (Artifact Registry 管理員)
    *   **Cloud Build Service Account**
6.  儲存後，等待 1 分鐘，然後重新執行部署。

#### 1. `Cloud Billing API has not been used` (403 Error)
如果您在部署時看到：
```
"message": "Cloud Billing API has not been used in project ... before or it is disabled."
```
**解決方案：**
1. 點擊此連結：[啟用 Cloud Billing API](https://console.developers.google.com/apis/api/cloudbilling.googleapis.com/overview?project=ivan-ai-photo-web)
2. 點擊藍色的 **「啟用 (ENABLE)」** 按鈕。

#### 2. `Secret [projects/.../GEMINI_API_KEY] not found` (404 Error)
**解決方案 (必須手動建立)：**
1. 前往 **[Google Cloud Secret Manager](https://console.cloud.google.com/security/secret-manager?project=ivan-ai-photo-web)**
2. 建立機密名稱：`GEMINI_API_KEY`
3. 貼上您的 API Key。

---

### 部署流程

1.  **設定 GitHub Secrets**
    *   在 GitHub Repository Settings -> Secrets and variables -> Actions 中。
    *   確保 `FIREBASE_SERVICE_ACCOUNT` 包含完整的 Service Account JSON 內容。

2.  **觸發部署**
    *   只要推送 (Push) 代碼到 `main` 分支，GitHub Actions 就會自動執行。
