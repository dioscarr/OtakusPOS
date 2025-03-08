// Dio Rod
export function generateInvoiceTemplate(invoice: {
	supplier: string;
	rcn: string;
	nif: string;
	ncf: string;
	date: string;
	invoiceNumber: string;
	subtotal: number;
	tax: number;
	total: number;
	paymentType: string;
}): string {
	const template = `
| Campo           | Valor                                  |
|-----------------|----------------------------------------|
| Proveedor       | ${invoice.supplier}                    |
| RCN             | ${invoice.rcn || 'N/A'}                |
| NIF             | ${invoice.nif || 'N/A'}                |
| NCF             | ${invoice.ncf || 'N/A'}                |
| Fecha           | ${invoice.date}                        |
| Nº Factura      | ${invoice.invoiceNumber || 'N/A'}      |
| Subtotal        | RD$ ${invoice.subtotal.toFixed(2)}     |
| ITBIS           | RD$ ${invoice.tax.toFixed(2)}          |
| Total           | RD$ ${invoice.total.toFixed(2)}        |
| Forma de Pago   | ${invoice.paymentType || 'N/A'}        |
`;
	return template.trim();
}
