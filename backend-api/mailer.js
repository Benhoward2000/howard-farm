const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // or smtp.zoho.com when you switch
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function sendEmail(to, subject, html) {
  const bccAddress = "orders@howardsfarm.org";

  console.log("📧 Preparing email:");
  console.log("   To:", to);
  console.log("   BCC:", bccAddress);
  console.log("   Subject:", subject);

  const mailOptions = {
    from: `"Howard's Farm" <${process.env.EMAIL_USER}>`,
    to,
    bcc: bccAddress,
    subject,
    html,
  };

  return transporter
    .sendMail(mailOptions)
    .then(info => {
      console.log("✅ Email sent:", info.response);
      return info;
    })
    .catch(err => {
      console.error("❌ Email send failed:", err.message);
      throw err;
    });
}

module.exports = { sendEmail };
