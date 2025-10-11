# 1. Clone the repository (if not already cloned)
git clone https://github.com/switch41/Nxtwave.git
cd Nxtwave

# 2. Rewrite all commit history to use your credentials
git rebase -i --root
# Then for each commit, use 'edit' and run:
git commit --amend --author="switch41 <kushalparihar013@gmail.com>" --no-edit
git rebase --continue
# After all commits are updated:
git push --force origin main