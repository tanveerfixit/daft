# Hostinger Environment Variables

You can use these settings in your Hostinger Node.js dashboard (Environment Variables section) or copy them into your production `.env` file on the server.

### Database Settings
| Key | Value |
|-----|-------|
| `DB_HOST` | `127.0.0.1` |
| `DB_PORT` | `3306` |
| `DB_NAME` | `u123456789_epos_db` |
| `DB_USER` | `u123456789_db_user` |
| `DB_PASS` | `YourDatabasePasswordHere` |

### SMTP Email Settings
| Key | Value |
|-----|-------|
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | `noreply@yourdomain.com` |
| `SMTP_PASS` | `YourEmailPasswordHere` |
| `SMTP_FROM_NAME` | `Your Store EPOS` |
| `SMTP_FROM_EMAIL` | `noreply@yourdomain.com` |

### Application Settings
| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `JWT_SECRET` | `generate_a_random_secure_32_plus_char_secret_here` |
| `DEV_PASS` | `admin123` |

---

## How to use in Hostinger:
1. Log in to your Hostinger hPanel.
2. Go to **Websites** -> **Manage** -> **Node.js**.
3. Under **Environment variables**, click **Edit**.
4. Add each key and value from the tables above with your real credentials.
5. Click **Save** and **Restart** your application.
