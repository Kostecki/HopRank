import nodemailer, { type Transporter } from "nodemailer";

import { getMagicLinkEmail } from "~/utils/email";
import { env } from "~/utils/env.server";

export const sendMagicLinkEmail = async ({
	email,
	code,
	magicLink,
}: {
	email: string;
	code: string;
	magicLink: string;
}) => {
	let transporter: Transporter;

	if (env.NODE_ENV !== "production") {
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
		// Checked at startup: all four are required in production.
		transporter = nodemailer.createTransport({
			host: env.SMTP_HOST,
			port: env.SMTP_PORT,
			secure: env.SMTP_PORT === 465,
			auth: {
				user: env.SMTP_USER,
				pass: env.SMTP_PASS,
			},
		});
	}

	try {
		const info = await transporter.sendMail({
			from: env.SMTP_FROM,
			to: email,
			subject: "🍻 Din HopRank login-kode 🍻",
			text: `Din login-kode er: ${code}\nMagic Link: ${magicLink}`,
			html: await getMagicLinkEmail(code, magicLink, env.APP_URL),
		});

		if (env.NODE_ENV !== "production") {
			console.log();
			console.log("[Email] Code:", code);
			console.log("[Email] URL:", nodemailer.getTestMessageUrl(info));
			console.log();
		}
	} catch (error) {
		console.error("[Email] Failed to send email:", error);
		throw new Error("Noget gik galt ved afsendelse af login-email. Prøv igen.");
	}
};
