# Lorem ipsum blog

A Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent urna ante, consectetur vitae lacus at, lacinia placerat nisi. Nulla dapibus nibh vel est viverra condimentum. Nunc turpis magna, porttitor sit amet facilisis eget, semper vel ligula. Mauris eget urna a ligula vehicula tempor a et est. In mollis cursus felis, a sagittis felis pretium in. Etiam blandit, risus quis auctor laoreet, purus ligula aliquet nisl, id euismod magna est sit amet magna. Suspendisse ut rhoncus lacus.

## WordPress

The blog itself is a WordPress install in this folder on the server, installed and updated via the hosting provider. It is not in this repo and site deploys leave this folder alone.

Tracked here is only the script that posts to it:

- `publish_post.php`: run every minute by cron; picks a random time each day and publishes a lorem ipsum post via the WordPress REST API
- `composer.json`, `composer.lock`: dependencies for the script
- `crontab.txt`: the cron line

## Setup

- Replace <path> with actual paths
- Replace <username> with actual username
- Replace <token> with actual token
- Replace <wp_url> with actual WordPress URL
