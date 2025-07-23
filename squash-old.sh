#
# This script will take a git history, and perform
# a squash operation that turns "all commits older
# than a day" into a single base commit that replaces
# the existing base commit for the repository.
#
# One day is a bit aggressive, but this is a PoC
# script more than anything right now. In real
# use, you'd make it collapse everything older
# than a month into "the new base commit", squash
# anything older than 7 days into one commit per
# day, and leave the most recent week of commits
# untouched.
#
# So that you can do sensible rollbaks.
#

# Run this with ./squash-old.sh projectname
DIR="content/$1"
cd ${DIR}

# Be nice to people, use an editor that tells them how to exit =)
GIT_EDITOR="nano"
GIT_SEQUENCE_EDITOR="nano"

BRANCH=$(git branch --show-current)
FIRST=$(git rev-list --max-parents=0 HEAD)

# As part of PoC, simply collapse anything older than a day
KEEP=$(git log --pretty=format:"%H"--before="yesterday" -1)
if [[ ! -z "${KEEP}" ]]; then
echo "${BRANCH} ${FIRST} ${KEEP}"
git checkout ${KEEP}
git reset --soft ${FIRST}
git commit --ammend --allow-empty-commit
git tag historycollapse
git checkout ${BRANCH}
git rebase --onto historycollapse ${KEEP}
git tag -d historycollapse
else
echo "no commits older than a day found"
fi
