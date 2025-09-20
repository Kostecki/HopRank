import mjml2html from "mjml";
import { invariant } from "./invariant";

/**
 * Generates the HTML content for a magic link login email using MJML.
 *
 * @param code - The one-time passcode to display in the email.
 * @param magicLink - The full magic link URL that allows the user to log in directly.
 * @returns The compiled HTML string to be sent as an email.
 */
export const getMagicLinkEmail = (code: string, magicLink: string) => {
  const APP_URL = process.env.APP_URL;
  invariant(APP_URL, "APP_URL is not defined");

  const mjml = `<mjml>
  <mj-body width="400">
    <mj-section>
      <mj-column>
        <mj-image width="100px" src="${APP_URL}/logo.png"></mj-image>

        <mj-divider border-width="1px" border-color="#c3c6d0"></mj-divider>

        <mj-text font-size="20px" color="#484f65" font-family="helvetica" font-weight="bold" align="center" padding-bottom="25px">Log ind på HopRank</mj-text>

        <mj-text font-size="16px" color="#484f65" font-family="helvetica" align="center">Med følgende kode:</mj-text>
        <mj-text font-size="16px" color="#484f65" font-family="helvetica" font-weight="bold" align="center" padding-top="0px">${code}</mj-text>
        
        <mj-text font-size="16px" color="#484f65" font-family="helvetica" padding-top="20px" align="center">Eller direkte med knappen herunder</mj-text>
        <mj-button href="${magicLink}" background-color="#484f65" padding-top="0px">Log ind</mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

  const { html } = mjml2html(mjml);

  return html;
};
