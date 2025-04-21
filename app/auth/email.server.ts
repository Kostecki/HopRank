import nodemailer from "nodemailer";
import invariant from "tiny-invariant";

import { getMagicLinkEmail } from "~/utils/email";

const SMTP_FROM = process.env.SMTP_FROM;
invariant(SMTP_FROM, "SMTP_FROM must be set");

export async function sendMagicLinkEmail({
  email,
  code,
  magicLink,
}: {
  email: string;
  code: string;
  magicLink: string;
}) {
  let transporter: nodemailer.Transporter;

  if (process.env.NODE_ENV !== "production") {
    const etherealAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: etherealAccount.smtp.host,
      port: etherealAccount.smtp.port,
      secure: etherealAccount.smtp.secure,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
      },
    });
  } else {
    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = process.env.SMTP_PORT;
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    invariant(SMTP_HOST, "SMTP_HOST must be set");
    invariant(SMTP_PORT, "SMTP_PORT must be set");
    invariant(SMTP_USER, "SMTP_USER must be set");
    invariant(SMTP_PASS, "SMTP_PASS must be set");

    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: "Din HopRank login-kode ✨",
      text: `Din login-kode er: ${code}\nMagic Link: ${magicLink}`,
      html: getMagicLinkEmail(code, magicLink),
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("Email Preview URL:", nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Noget gik galt ved afsendelse af login-email. Prøv igen.");
  }
}
