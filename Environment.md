# Hostinger Environment Variables

You can use these settings in your Hostinger Node.js dashboard (Environment Variables section) or copy them into your production `.env` file on the server.

### Database Settings
| Key | Value |
|-----|-------|
| `DB_HOST` | `127.0.0.1` |
| `DB_PORT` | `3306` |
| `DB_NAME` | `u583652021_clare` |
| `DB_USER` | `u583652021_clare_user` |
| `DB_PASS` | `Tani@8877!!` |

### SMTP Email Settings
| Key | Value |
|-----|-------|
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | `noreply@daft.pk` |
| `SMTP_PASS` | `Tani$8877!!` |
| `SMTP_FROM_NAME` | `Clare epos` |
| `SMTP_FROM_EMAIL` | `noreply@daft.pk` |

### Application Settings
| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `JWT_SECRET` | `supersecretjwtkey_epos_clarelab_2026` |
| `DEV_PASS` | `admin123` |

---

## How to use in Hostinger:
1. Log in to your Hostinger hPanel.
2. Go to **Websites** -> **Manage** -> **Node.js**.
3. Under **Environment variables**, click **Edit**.
4. Add each key and value from the tables above.
5. Click **Save** and **Restart** your application.
