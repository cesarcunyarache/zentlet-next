import { describe, expect, it } from "vitest";
import { emailBody } from "../html-text";
import { parseBankEmail } from "../parse-email";

const BCP_DEBIT = `Hola Cesar Efrain,

Realizaste un consumo de S/ 14.50 con tu Tarjeta de Débito BCP en IKF A53 PIURA 21.

Por tu seguridad, te enviamos los datos de tu operación.

 
Monto

 
Total del consumo\tS/ 14.50
 
Datos de la operación

 
Operación realizada\tConsumo Tarjeta de Débito
Fecha y hora\t24 de setiembre de 2026 - 06:54 PM
Número de Tarjeta de Débito\t************6973
Empresa\tIKF A53 PIURA 21
Número de operación\t576278`;

const BCP_DEBIT_HTML = `<html><head><style>.x{color:red}</style></head><body>
<p>Hola Cesar Efrain,</p>
<p>Realizaste un consumo de S/ 14.50 con tu Tarjeta de D&eacute;bito BCP en IKF A53 PIURA 21.</p>
<table>
<tr><td>Total del consumo</td><td>S/ 14.50</td></tr>
<tr><td>Fecha y hora</td><td>24 de setiembre de 2026 - 06:54 PM</td></tr>
<tr><td>N&uacute;mero de Tarjeta de D&eacute;bito</td><td>************6973</td></tr>
<tr><td>Empresa</td><td>IKF A53 PIURA 21</td></tr>
<tr><td>N&uacute;mero de operaci&oacute;n</td><td>576278</td></tr>
</table></body></html>`;

const EXPECTED_BCP = {
  type: "expense",
  amount: 14.5,
  currency: "PEN",
  merchant: "Ikf A53 Piura 21",
  description: "Ikf A53 Piura 21",
  transactionDate: "2026-09-24",
  cardLast4: "6973",
  reference: "576278",
};

describe("parseBankEmail", () => {
  it("reads the BCP debit card notification", () => {
    expect(parseBankEmail(emailBody(BCP_DEBIT, ""))).toEqual(EXPECTED_BCP);
  });

  it("reads the same notification when only HTML is available", () => {
    expect(parseBankEmail(emailBody("", BCP_DEBIT_HTML))).toEqual(EXPECTED_BCP);
  });

  it("reads labels with the value on the next line", () => {
    const body = emailBody("Monto\nUS$ 1,250.00\nComercio\nAMAZON MKTPLACE\nFecha\n03/09/2026", "");
    expect(parseBankEmail(body)).toMatchObject({
      amount: 1250,
      currency: "USD",
      merchant: "Amazon Mktplace",
      transactionDate: "2026-09-03",
    });
  });

  it("falls back to the intro sentence for the merchant", () => {
    const body = emailBody("Realizaste una compra de S/ 89.90 con tu Tarjeta de Crédito en RIPLEY JOCKEY.\n", "");
    expect(parseBankEmail(body)).toMatchObject({ amount: 89.9, merchant: "Ripley Jockey" });
  });

  it("detects received transfers as income and uses the subject as description", () => {
    const body = emailBody("Recibiste una transferencia por S/ 300.00 el 12/09/2026.", "");
    expect(parseBankEmail(body, "Transferencia recibida")).toMatchObject({
      type: "income",
      amount: 300,
      description: "Transferencia recibida",
      transactionDate: "2026-09-12",
    });
  });

  it("ignores emails without an amount", () => {
    expect(parseBankEmail("Actualizamos nuestros términos y condiciones.")).toBeNull();
  });
});
