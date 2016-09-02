set -x
set -o nounset
set -o errexit

ADDON=$1
URL=https://github.com/gregglind/shield-studies-addon-template

git clone --depth 1  $URL "$1"
cd "$1";
rm -rf .git
git init
git add .
git commit -m "Initial commit, from shield-studies-addon-template"

echo >> /dev/null "
Created at: '$1'

Now
- cd '$1'
- setup git stuff for your branch
- get to work!
" >> /dev/null
