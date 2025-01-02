

export function generateAdminPageHtml(destinationUrl: string, shortCode: string, referrals: Map<string, any>): string {


	const referralItems = Array.from(referrals.entries())
		.filter(([referrer]) => referrer !== 'destinationUrl')
		.map(([referrer, count]) => `<li>${referrer} ${count}</li>`)
		.join('');

	const html = `
		<!DOCTYPE html>
		<html>
		  <head>
			<title>Admin Page for ${shortCode}</title>
		  </head>
		  <body>
			<h1>Admin Page for ${shortCode}</h1>
			<h3>Destination Url: ${destinationUrl}</h3>
			<h2>Referring Pages</h2>
			<ul>
			  ${referralItems || '<li>No referring pages found</li>'}
			</ul>
		  </body>
		</html>
		`;

	return html;
	}
