import os
import sys
import json
import base64
import tempfile
import pymupdf

def get_marathi_number_words(n):
    if not isinstance(n, (int, float)) or n <= 0:
        return "—"
    n = int(n)

    units = {
        0: "", 1: "एक", 2: "दोन", 3: "तीन", 4: "चार", 5: "पाच", 6: "सहा", 7: "सात", 8: "आठ", 9: "नऊ",
        10: "दहा", 11: "अकरा", 12: "बारा", 13: "तेरा", 14: "चौदा", 15: "पंधरा", 16: "सोळा", 17: "सतरा", 18: "अठरा", 19: "एकोणीस",
        20: "वीस", 21: "एकवीस", 22: "बावीस", 23: "तेवीस", 24: "चोवीस", 25: "पंचवीस", 26: "सव्वीस", 27: "सत्तावीस", 28: "अठ्ठावीस", 29: "एकोणतीस",
        30: "तीस", 31: "एकतीस", 32: "बत्तीस", 33: "तेहेतीस", 34: "चौतीस", 35: "पस्तीस", 36: "छत्तीस", 37: "सदतीस", 38: "अडतीस", 39: "एकोणचाळीस",
        40: "चाळीस", 41: "एक्केचाळीस", 42: "बेचाळीस", 43: "त्रेचाळीस", 44: "चव्वेचाळीस", 45: "पंचेचाळीस", 46: "शेहेचाळीस", 47: "सत्तेचाळीस", 48: "अठ्ठेचाळीस", 49: "एकोणपन्नास",
        50: "पन्नास", 51: "एकावन्न", 52: "बावन्न", 53: "त्रेपन्न", 54: "चौपन्न", 55: "पंचावन्न", 56: "छपन्न", 57: "सत्तावन्न", 58: "अठ्ठावन्न", 59: "एकोणसाठ",
        60: "साठ", 61: "एकसष्ठ", 62: "बासष्ठ", 63: "त्रेसष्ठ", 64: "चौसष्ठ", 65: "पासष्ठ", 66: "सहासष्ठ", 67: "सदुसष्ठ", 68: "अडुसष्ठ", 69: "एकोणसत्तर",
        70: "सत्तर", 71: "एकाहत्तर", 72: "बाहत्तर", 73: "त्र्याहत्तर", 74: "चौर्‍याहत्तर", 75: "पंच्याहत्तर", 76: "शहात्तर", 77: "सत्त्याहत्तर", 78: "अठ्ठ्याहत्तर", 79: "एकोणऐंशी",
        80: "ऐंशी", 81: "एक्याऐंशी", 82: "ब्याऐंशी", 83: "त्र्याऐंशी", 84: "चौऱ्याऐंशी", 85: "पंच्याऐंशी", 86: "शहाऐंशी", 87: "सत्त्याऐंशी", 88: "अठ्ठ्याऐंशी", 89: "एकोणनव्वद",
        90: "नव्वद", 91: "एक्याण्णव", 92: "ब्याण्णव", 93: "त्र्याण्णव", 94: "चौऱ्याण्णव", 95: "पंच्याण्णव", 96: "शहाण्णव", 97: "सत्त्याण्णव", 98: "अठ्ठ्याण्णव", 99: "नव्याण्णव"
    }

    parts = []
    crore = n // 10000000
    n %= 10000000
    lakh = n // 100000
    n %= 100000
    thousand = n // 1000
    n %= 1000
    hundred = n // 100
    rem = n % 100

    if crore > 0:
        parts.append(f"{units.get(crore, str(crore))} कोटी")
    if lakh > 0:
        parts.append(f"{units.get(lakh, str(lakh))} लाख")
    if thousand > 0:
        parts.append(f"{units.get(thousand, str(thousand))} हजार")
    if hundred > 0:
        parts.append(f"{units.get(hundred, str(hundred))} शे")
    if rem > 0:
        parts.append(units.get(rem, str(rem)))

    words = " ".join(parts).strip()
    return f"रुपये {words} फक्त" if words else "रुपये शून्य फक्त"

def clean_val(val, fallback="—"):
    if val is None:
        return fallback
    s = str(val).strip()
    return s if s and s.lower() not in ("null", "undefined", "[object object]") else fallback

def generate_pauti_pdf(data):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, "../../../"))

    font_candidates = [
        os.path.join(current_dir, "../../fonts"),
        os.path.join(project_root, "artifacts/api-server/fonts"),
        os.path.abspath("artifacts/api-server/fonts"),
        os.path.abspath("fonts")
    ]
    fonts_dir = next((d for d in font_candidates if os.path.exists(d)), font_candidates[0])

    logo_candidates = [
        os.path.join(project_root, "artifacts/meditiya-sathi/public/logo.png"),
        os.path.abspath("artifacts/meditiya-sathi/public/logo.png"),
        os.path.abspath("public/logo.png")
    ]
    logo_path = next((p for p in logo_candidates if os.path.exists(p)), "")

    logo_b64 = ""
    if logo_path and os.path.exists(logo_path):
        with open(logo_path, "rb") as f:
            logo_b64 = "data:image/png;base64," + base64.b64encode(f.read()).decode('utf-8')

    receipt_no = clean_val(data.get("receiptNumber"))
    donation_date = clean_val(data.get("donationDate"))
    festival_name = clean_val(data.get("festivalName"), "गणेश उत्सव")
    festival_year = data.get("festivalYear")
    if festival_year:
        fest_title = f"{festival_name} {festival_year}"
    else:
        fest_title = festival_name

    donor_name = clean_val(data.get("name"))
    mobile = clean_val(data.get("mobile"))
    building = clean_val(data.get("building"))
    wing = clean_val(data.get("wing"))
    flat = clean_val(data.get("flat"))

    if building != "—" and wing != "—":
        bldg_wing = f"{building} - {wing}"
    elif building != "—":
        bldg_wing = building
    elif wing != "—":
        bldg_wing = wing
    else:
        bldg_wing = "—"

    amount_val = data.get("amount", 0)
    try:
        amount_num = float(amount_val)
    except:
        amount_num = 0.0

    formatted_amount = f"₹ {amount_num:,.0f}/-" if amount_num.is_integer() else f"₹ {amount_num:,.2f}/-"

    amount_words_eng = clean_val(data.get("amountInWords"))
    amount_words_marathi = get_marathi_number_words(amount_num)
    if amount_words_eng and amount_words_eng != "—":
        amount_words_combined = f"{amount_words_marathi} ({amount_words_eng})"
    else:
        amount_words_combined = amount_words_marathi

    pay_method = clean_val(data.get("paymentMethod"), "CASH").upper().replace("_", " ")
    collected_by = clean_val(data.get("collectedBy"), "Admin (Authorized)")

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@font-face {{
  font-family: 'NotoDev';
  src: url('NotoSansDevanagari-Bold.ttf');
  font-weight: bold;
}}
@font-face {{
  font-family: 'NotoDev';
  src: url('NotoSansDevanagari-Regular.ttf');
  font-weight: normal;
}}

* {{
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}}

body {{
  font-family: 'NotoDev', sans-serif;
  color: #1a1a1a;
  background-color: #faf8f5;
  padding: 16px;
}}

.outer-table {{
  width: 100%;
  border-collapse: collapse;
  background-color: #ffffff;
  border: 2.5px solid #d4a638;
}}

/* ── HEADER ── */
.header-table {{
  width: 100%;
  border-collapse: collapse;
  background-color: #11141a;
  border-top: 4px solid #e0660f;
  border-bottom: 2.5px solid #d4a638;
}}

.logo-td {{
  width: 105px;
  padding: 18px 12px 18px 24px;
  vertical-align: middle;
  text-align: center;
}}

.logo-img {{
  width: 80px;
  height: 80px;
}}

.header-text-td {{
  padding: 18px 24px 18px 0;
  vertical-align: middle;
  text-align: center;
}}

.header-title {{
  color: #fff9ea;
  font-size: 23px;
  font-weight: bold;
  letter-spacing: 0.5px;
  line-height: 1.2;
}}

.header-english {{
  color: #f5d173;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 2px;
  margin-top: 4px;
  margin-bottom: 4px;
}}

.header-location {{
  color: #e5e7eb;
  font-size: 10.5px;
  margin-bottom: 3px;
}}

.header-subtag {{
  color: #ea9a4e;
  font-size: 9.5px;
}}

/* ── CONTENT BODY ── */
.body-td {{
  padding: 18px 22px 14px 22px;
}}

/* Title */
.title-table {{
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 14px;
}}

.title-text {{
  text-align: center;
  font-size: 23px;
  font-weight: bold;
  color: #11141a;
  letter-spacing: 1px;
}}

.title-subtext {{
  text-align: center;
  font-size: 10.5px;
  color: #e0660f;
  font-weight: bold;
  letter-spacing: 1.5px;
  margin-top: 2px;
}}

/* 3-Col Meta Box */
.meta-table {{
  width: 100%;
  border-collapse: collapse;
  background-color: #fdfbf7;
  border: 1.5px solid #dfd7c7;
  margin-bottom: 16px;
}}

.meta-td {{
  width: 33.33%;
  padding: 9px 14px;
  border-right: 1.5px solid #eae3d5;
  vertical-align: middle;
}}

.meta-td-last {{
  width: 33.34%;
  padding: 9px 14px;
  vertical-align: middle;
}}

.meta-lbl {{
  font-size: 8px;
  color: #6b7280;
  font-weight: bold;
  margin-bottom: 3px;
  text-transform: uppercase;
}}

.meta-val {{
  font-size: 12px;
  font-weight: bold;
  color: #11141a;
}}

.meta-val-fest {{
  font-size: 12px;
  font-weight: bold;
  color: #d97706;
}}

/* Donor Info Section */
.section-table {{
  width: 100%;
  border-collapse: collapse;
  border: 1.5px solid #dcd3c1;
  background-color: #ffffff;
  margin-bottom: 16px;
}}

.section-head-donor {{
  background-color: #e0660f;
  color: #ffffff;
  font-size: 9.5px;
  font-weight: bold;
  padding: 5px 14px;
  letter-spacing: 0.8px;
}}

.section-head-pay {{
  background-color: #1f242e;
  color: #f5d173;
  font-size: 9.5px;
  font-weight: bold;
  padding: 5px 14px;
  letter-spacing: 0.8px;
}}

.donor-inner-table {{
  width: 100%;
  border-collapse: collapse;
  padding: 8px;
}}

.donor-field-td {{
  width: 50%;
  padding: 8px 14px;
  vertical-align: top;
}}

.field-lbl {{
  font-size: 8px;
  color: #6b7280;
  font-weight: bold;
  margin-bottom: 2px;
}}

.field-val {{
  font-size: 12px;
  font-weight: bold;
  color: #11141a;
}}

/* Donation Details */
.donation-table {{
  width: 100%;
  border-collapse: collapse;
  border: 2px solid #d4a638;
  background-color: #fdfcf9;
  margin-bottom: 16px;
}}

.amount-td {{
  text-align: center;
  padding: 12px 14px 8px 14px;
}}

.amount-lbl {{
  font-size: 10px;
  font-weight: bold;
  color: #e0660f;
}}

.amount-val {{
  font-size: 30px;
  font-weight: bold;
  color: #11141a;
  margin: 4px 0;
}}

.amount-words-box {{
  font-size: 10.5px;
  color: #334155;
  background-color: #f3ede2;
  border: 1px solid #e2d7c5;
  padding: 4px 16px;
  margin-top: 4px;
  margin-bottom: 8px;
  display: inline-block;
}}

.pay-meta-table {{
  width: 100%;
  border-collapse: collapse;
  border-top: 1.5px solid #eae2d3;
}}

.pay-meta-left {{
  width: 50%;
  padding: 9px 16px;
  vertical-align: middle;
}}

.pay-meta-right {{
  width: 50%;
  padding: 9px 16px;
  vertical-align: middle;
  text-align: right;
}}

.method-tag {{
  background-color: #edf7ed;
  border: 1.5px solid #2e7d32;
  color: #1e4620;
  font-size: 10px;
  font-weight: bold;
  padding: 3px 12px;
  border-radius: 4px;
}}

/* Bottom Thank you & Receiver */
.bottom-table {{
  width: 100%;
  border-collapse: collapse;
  border: 1.5px solid #dfd7c7;
  background-color: #ffffff;
  margin-bottom: 6px;
}}

.thankyou-td {{
  padding: 12px 16px;
  vertical-align: middle;
}}

.thankyou-marathi {{
  font-size: 10.5px;
  font-weight: bold;
  color: #e0660f;
  margin-bottom: 3px;
}}

.thankyou-english {{
  font-size: 9px;
  color: #64748b;
  margin-bottom: 4px;
}}

.blessing-text {{
  font-size: 10px;
  font-weight: bold;
  color: #b45309;
}}

.receiver-td {{
  width: 160px;
  border-left: 1.5px solid #eae2d3;
  padding: 12px 16px;
  vertical-align: middle;
  text-align: center;
}}

.receiver-lbl {{
  font-size: 8px;
  color: #6b7280;
  font-weight: bold;
}}

.receiver-name {{
  font-size: 11px;
  font-weight: bold;
  color: #11141a;
  margin: 3px 0 5px 0;
}}

.verified-stamp {{
  background-color: #edf7ed;
  border: 1.5px solid #2e7d32;
  color: #1e4620;
  font-size: 8px;
  font-weight: bold;
  padding: 2px 8px;
  display: inline-block;
  border-radius: 3px;
}}

/* ── FOOTER ── */
.footer-table {{
  width: 100%;
  border-collapse: collapse;
  background-color: #11141a;
  border-top: 2.5px solid #d4a638;
  border-bottom: 4px solid #e0660f;
}}

.footer-td {{
  padding: 14px 20px;
  text-align: center;
}}

.footer-raja {{
  color: #f5d173;
  font-size: 18px;
  font-weight: bold;
  letter-spacing: 1.5px;
  margin-bottom: 3px;
}}

.footer-subtext {{
  color: #d1d5db;
  font-size: 9.5px;
  margin-bottom: 3px;
}}

.footer-note {{
  color: #9ca3af;
  font-size: 7.5px;
}}
</style>
</head>
<body>

<table class="outer-table">
  <!-- Header -->
  <tr>
    <td>
      <table class="header-table">
        <tr>
          <td class="logo-td">
            <img class="logo-img" src="{logo_b64}" alt="Mandal Logo" />
          </td>
          <td class="header-text-td">
            <div class="header-title">मेड़तिया मित्र मंडळ</div>
            <div class="header-english">MEDITIYA MITRA MANDAL</div>
            <div class="header-location">मेड़तिया नगर, कांदिवली (पूर्व), मुंबई – 400101</div>
            <div class="header-subtag">सार्वजनिक गणेशोत्सव मंडळ • स्थापना: २००१</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Main Body -->
  <tr>
    <td class="body-td">
      <!-- Title -->
      <table class="title-table">
        <tr>
          <td>
            <div class="title-text">❖   पावती   ❖</div>
            <div class="title-subtext">DONATION RECEIPT</div>
          </td>
        </tr>
      </table>

      <!-- Meta Info -->
      <table class="meta-table">
        <tr>
          <td class="meta-td">
            <div class="meta-lbl">पावती क्रमांक / RECEIPT NO.</div>
            <div class="meta-val">{receipt_no}</div>
          </td>
          <td class="meta-td">
            <div class="meta-lbl">दिनांक / DATE</div>
            <div class="meta-val">{donation_date}</div>
          </td>
          <td class="meta-td-last">
            <div class="meta-lbl">उत्सव / FESTIVAL</div>
            <div class="meta-val-fest">{fest_title}</div>
          </td>
        </tr>
      </table>

      <!-- Donor Info -->
      <table class="section-table">
        <tr>
          <td class="section-head-donor">दात्याची माहिती / DONOR INFORMATION</td>
        </tr>
        <tr>
          <td style="padding: 6px 8px 8px 8px;">
            <table class="donor-inner-table">
              <tr>
                <td class="donor-field-td">
                  <div class="field-lbl">दात्याचे नाव / Donor Name</div>
                  <div class="field-val">{donor_name}</div>
                </td>
                <td class="donor-field-td">
                  <div class="field-lbl">मोबाईल क्रमांक / Mobile No.</div>
                  <div class="field-val">{mobile}</div>
                </td>
              </tr>
              <tr>
                <td class="donor-field-td">
                  <div class="field-lbl">इमारत व विंग / Building & Wing</div>
                  <div class="field-val">{bldg_wing}</div>
                </td>
                <td class="donor-field-td">
                  <div class="field-lbl">फ्लॅट क्रमांक / Flat No.</div>
                  <div class="field-val">{flat}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Donation Details -->
      <table class="donation-table">
        <tr>
          <td class="section-head-pay">देणगी तपशील / DONATION DETAILS</td>
        </tr>
        <tr>
          <td class="amount-td">
            <div class="amount-lbl">देणगी रक्कम / Donation Amount</div>
            <div class="amount-val">{formatted_amount}</div>
            <div class="amount-words-box">रकमेचे शब्दांत / Amount in Words : {amount_words_combined}</div>
          </td>
        </tr>
        <tr>
          <td>
            <table class="pay-meta-table">
              <tr>
                <td class="pay-meta-left">
                  <span class="field-lbl" style="display:inline-block; margin-right: 8px;">पेमेंट पद्धत / Method:</span>
                  <span class="method-tag">{pay_method}</span>
                </td>
                <td class="pay-meta-right">
                  <span class="field-lbl" style="display:inline-block; margin-right: 8px;">पेमेंट दिनांक / Date:</span>
                  <span class="field-val" style="font-size: 11px;">{donation_date}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Bottom: Thank you & Receiver -->
      <table class="bottom-table">
        <tr>
          <td class="thankyou-td">
            <div class="thankyou-marathi">आपल्या मौल्यवान देणगीबद्दल मनःपूर्वक धन्यवाद !</div>
            <div class="thankyou-english">Thank you for your valuable contribution and support.</div>
            <div class="blessing-text">॥ गणपती बाप्पा मोरया, मंगलमूर्ती मोरया ॥</div>
          </td>
          <td class="receiver-td">
            <div class="receiver-lbl">प्राप्तकर्ता / RECEIVED BY</div>
            <div class="receiver-name">{collected_by}</div>
            <div class="verified-stamp">✓ VERIFIED RECEIPT</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td>
      <table class="footer-table">
        <tr>
          <td class="footer-td">
            <div class="footer-raja">✦   मेड़तियाचा राजा   ✦</div>
            <div class="footer-subtext">मेड़तिया मित्र मंडळ • कांदिवली (पूर्व), मुंबई – ४००१०१</div>
            <div class="footer-note">ही संगणकीय पावती असल्याने स्वाक्षरीची आवश्यकता नाही • Official Computer Generated Receipt</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

</body>
</html>
"""

    arch = pymupdf.Archive(fonts_dir)
    story = pymupdf.Story(html=html, archive=arch)

    tmp = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
    tmp_path = tmp.name
    tmp.close()

    try:
        writer = pymupdf.DocumentWriter(tmp_path)
        device = writer.begin_page(pymupdf.Rect(0, 0, 595.28, 841.89))
        story.place(pymupdf.Rect(0, 0, 595.28, 841.89))
        story.draw(device)
        writer.end_page()
        writer.close()
        del writer
        with open(tmp_path, 'rb') as f:
            pdf_bytes = f.read()
        return pdf_bytes
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except:
                pass

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--stdin":
        input_bytes = sys.stdin.buffer.read()
        input_json = input_bytes.decode('utf-8', errors='replace') if input_bytes else "{}"
        data = json.loads(input_json) if input_json.strip() else {}
        pdf_bytes = generate_pauti_pdf(data)
        sys.stdout.buffer.write(pdf_bytes)
    else:
        test_data = {
            "receiptNumber": "REC/2026/000123",
            "donationDate": "18/05/2026",
            "name": "राजेश व्ही. शर्मा (Rajesh V. Sharma)",
            "mobile": "+91 98765 43210",
            "building": "गोकुळ धाम",
            "wing": "Wing A",
            "flat": "402",
            "amount": 5001,
            "paymentMethod": "upi",
            "festivalName": "गणेश उत्सव",
            "festivalYear": 2026,
            "collectedBy": "Admin (Authorized)",
            "amountInWords": "Rupees Five Thousand One Only"
        }
        pdf_bytes = generate_pauti_pdf(test_data)
        with open("test_pauti_cli.pdf", "wb") as f:
            f.write(pdf_bytes)
        print("Successfully generated test_pauti_cli.pdf (bytes:", len(pdf_bytes), ")")
