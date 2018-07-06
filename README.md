# Annie's Havens Website
This repo is for the development work done for Annie's Havens - a foster care agency in the province of Ontario. The goal of the website is to raise awareness of Annie's Havens to potential foster parents.
## Technologies Used
The pages served to the browser are rendered on a NodeJS server using Express. The templating engine is Express-Handlebars utilizing a helper function to inject page specific Javascript thanks to [Wolfgang Ziegler](https://wolfgang-ziegler.com/blog/a-scripts-section-for-your-handlebars-layout-template).
Nodemailer is used on the server to send messages that users create on the website. Bot screening is handled by Recaptcha offscreen.
The entire UI framework utilizes [MaterializeCSS](https://materializecss.com/) with some custom CSS added.
## SEO
A JSON file is used to supply the metadata for each page including OpenGraph tags. Not sure of this is the best approach.
## Notes
Some work was done to get the page load time down. Videos are lazy loaded and future work will include getting images to lazy load.