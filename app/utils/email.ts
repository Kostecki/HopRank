import mjml2htmlUntyped from "mjml";

import { invariant } from "./invariant";

// The installed mjml@5 package is async at runtime (mjml2html is an `async
// function`), but @types/mjml@5 still describes the older sync v4 signature.
// Re-type it to match actual behavior instead of suppressing the mismatch.
const mjml2html = mjml2htmlUntyped as unknown as (
	input: string,
) => Promise<{ html: string }>;

/**
 * Generates the HTML content for a magic link login email using MJML.
 *
 * @param code - The one-time passcode to display in the email.
 * @param magicLink - The full magic link URL that allows the user to log in directly.
 * @returns The compiled HTML string to be sent as an email.
 */
export const getMagicLinkEmail = async (code: string, magicLink: string) => {
	const APP_URL = process.env.APP_URL;
	invariant(APP_URL, "APP_URL is not defined");

	const mjml = `<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Helvetica, Arial, sans-serif"></mj-all>
    </mj-attributes>
    <mj-style>
      .code-pill {
        border-radius: 12px;
      }
    </mj-style>
  </mj-head>
  <mj-body background-color="#f2f3f6" width="480px">
    <mj-section padding="32px 16px 16px">
      <mj-column>
        <mj-image width="72px" src="${APP_URL}/logo.png" padding="0"></mj-image>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" border-radius="20px" padding="8px 32px 40px">
      <mj-column>
        <mj-text font-size="28px" color="#2d3045" font-weight="700" align="center" padding-top="16px" padding-bottom="4px">HopRank</mj-text>
        <mj-text font-size="15px" color="#757d9e" align="center" padding-bottom="24px">Brug koden, eller klik på knappen for at logge ind</mj-text>

        <mj-text css-class="code-pill" container-background-color="#fff3cb" font-size="28px" font-weight="700" letter-spacing="6px" color="#af8200" align="center" padding="16px">${code}</mj-text>
        <mj-text font-size="13px" color="#a3a9bf" align="center" padding-top="8px" padding-bottom="24px">Koden er gyldig i 5 minutter</mj-text>

        <mj-button href="${magicLink}" background-color="#484f65" border-radius="8px" font-size="16px" padding="0">Log ind</mj-button>
      </mj-column>
    </mj-section>

    <mj-section padding="16px 16px 32px">
      <mj-column>
        <mj-text font-size="12px" color="#a3a9bf" align="center">Har du ikke selv anmodet om denne email, kan du roligt ignorere den</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

	const { html } = await mjml2html(mjml);

	return html;
};
