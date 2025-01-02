

export function generateAdminPageHtml(destinationUrl: string, shortCode: string, referrals: { referrer: string, count: number}[]): string {


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
		  ${
			referrals.length
			  ? referrals
				  .map(row => `<li>${row.referrer} ${row.count}</li>`)
				  .join('')
			  : '<li>No referring pages found</li>'
		  }
		</ul>
	  </body>
	</html>
	`;

	return html;
	}
