# GitHub Setup Guide for FusionFlow

This guide will help you configure all necessary GitHub settings for the FusionFlow project, including secrets, branch protection, and team access.

## 🔐 Step 1: Configure Repository Secrets

### Access Repository Settings

1. Navigate to your GitHub repository: `https://github.com/your-username/fusionflow`
2. Click on the **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**

### Required Secrets

#### 1. NPM_TOKEN (Required for publishing packages)

**Purpose:** Authenticates with npm registry to publish packages

**How to create:**
1. Go to [npmjs.com](https://www.npmjs.com) and sign in
2. Click on your profile picture → **Access Tokens**
3. Click **Generate New Token**
4. Select **Automation** token type
5. Set expiration (recommended: 90 days)
6. Click **Generate Token**
7. **Copy the token immediately** (it starts with `npm_`)

**Add to GitHub:**
- **Name:** `NPM_TOKEN`
- **Value:** Your npm token (starts with `npm_`)

#### 2. SNYK_TOKEN (Optional - for security scanning)

**Purpose:** Enables Snyk security vulnerability scanning

**How to create:**
1. Go to [snyk.io](https://snyk.io) and sign up/login
2. Navigate to **Account Settings** → **Auth Token**
3. Copy your API token

**Add to GitHub:**
- **Name:** `SNYK_TOKEN`
- **Value:** Your Snyk API token

#### 3. DOCKER_USERNAME (Optional - for Docker builds)

**Purpose:** Docker Hub username for building and pushing images

**Add to GitHub:**
- **Name:** `DOCKER_USERNAME`
- **Value:** Your Docker Hub username

#### 4. DOCKER_PASSWORD (Optional - for Docker builds)

**Purpose:** Docker Hub password or access token

**How to create:**
1. Go to [hub.docker.com](https://hub.docker.com) and sign in
2. Click **Account Settings** → **Security**
3. Click **New Access Token**
4. Give it a name (e.g., "GitHub Actions")
5. Copy the generated token

**Add to GitHub:**
- **Name:** `DOCKER_PASSWORD`
- **Value:** Your Docker Hub access token

### Adding Secrets

For each secret above:

1. Click **New repository secret**
2. Enter the **Name** (exactly as shown)
3. Enter the **Value**
4. Click **Add secret**

## 🛡️ Step 2: Configure Branch Protection

### Protect Main Branch

1. Go to **Settings** → **Branches**
2. Click **Add rule**
3. Set **Branch name pattern** to `main`
4. Enable these options:

#### Required Settings:
- ✅ **Require a pull request before merging**
- ✅ **Require status checks to pass before merging**
- ✅ **Require branches to be up to date before merging**
- ✅ **Include administrators**

#### Status Checks Required:
Add these status checks:
- `Flow DSL Validation`
- `Flow DSL Security & Quality`
- `Flow DSL Integration Tests`
- `Flow DSL Documentation Check`
- `Flow DSL Performance Test`
- `Flow DSL Bundle Size Check`

#### Additional Settings:
- ✅ **Require conversation resolution before merging**
- ✅ **Require signed commits** (optional, for extra security)
- ✅ **Require linear history** (optional)

5. Click **Create**

### Protect Develop Branch (Optional)

Repeat the same process for the `develop` branch with slightly relaxed settings.

## 👥 Step 3: Configure Team Access

### Add Collaborators

1. Go to **Settings** → **Collaborators and teams**
2. Click **Add people** or **Add teams**

#### Recommended Permissions:

**Maintainers:**
- **Permission:** Admin
- **Can:** Manage repository, merge PRs, create releases

**Contributors:**
- **Permission:** Write
- **Can:** Push to branches, create PRs, review code

**Reviewers:**
- **Permission:** Read
- **Can:** View code, comment on PRs

## 🔧 Step 4: Configure Environments

### Production Environment

1. Go to **Settings** → **Environments**
2. Click **New environment**
3. Name: `production`
4. Configure protection rules:
   - ✅ **Required reviewers:** Add maintainers
   - ✅ **Wait timer:** 5 minutes (optional)
   - ✅ **Deployment branches:** `main` only

### Staging Environment

1. Create another environment named `staging`
2. Configure protection rules:
   - ✅ **Required reviewers:** Add contributors
   - ✅ **Deployment branches:** `develop` only

## 🧪 Step 5: Test Configuration

### Run Test Workflow

1. Go to **Actions** tab
2. Find **Test Secrets Configuration** workflow
3. Click **Run workflow**
4. Select options and click **Run workflow**

### Verify Results

The workflow will show:
- ✅ **NPM_TOKEN:** Configured (if set up correctly)
- ✅ **SNYK_TOKEN:** Configured (if set up)
- ⚠️ **Docker credentials:** Optional

## 📋 Step 6: Verify Workflows

### Check Workflow Permissions

1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**:
   - Select **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**

### Enable Actions

1. Go to **Settings** → **Actions** → **General**
2. Ensure **Actions permissions** is set to **Allow all actions and reusable workflows**

## 🔍 Step 7: Test Complete Pipeline

### Create a Test PR

1. Create a new branch from `main`
2. Make a small change to `packages/flow-dsl/README.md`
3. Create a pull request
4. Verify that all checks run:
   - Quick Validation
   - Security Check
   - Example Validation
   - PR Comment

### Expected Results

You should see:
- ✅ All validation checks pass
- ✅ Security scan completes
- ✅ Automated PR comment appears
- ✅ Status checks show green

## 🚀 Step 8: First Release

### Trigger Release

1. Merge a PR to `main` branch
2. The release workflow will automatically:
   - Detect changes
   - Run all validations
   - Create GitHub release
   - Publish to npm (if NPM_TOKEN is configured)

### Verify Release

1. Check **Releases** tab for new release
2. Verify npm package is published: `npm view @fusionflow/flow-dsl`
3. Check **Actions** tab for workflow completion

## 🔧 Troubleshooting

### Common Issues

#### NPM Token Issues
```
Error: npm ERR! 401 Unauthorized
```
**Solution:** Verify NPM_TOKEN is correctly set and has publish permissions

#### Workflow Not Running
```
No workflows found
```
**Solution:** Check Actions permissions in repository settings

#### Status Checks Not Found
```
Required status check "Flow DSL Validation" is not set
```
**Solution:** Ensure workflows are properly named and configured

#### Permission Denied
```
Error: Resource not accessible by integration
```
**Solution:** Check workflow permissions and repository access

### Debug Commands

#### Test NPM Token Locally
```bash
npm token list
npm whoami
```

#### Test GitHub Actions Locally
```bash
# Install act for local testing
brew install act
act -j test-secrets
```

## 📞 Support

If you encounter issues:

1. **Check GitHub Actions logs** for detailed error messages
2. **Verify secrets** using the test workflow
3. **Review permissions** in repository settings
4. **Check documentation** in the repository
5. **Create an issue** with detailed error information

## ✅ Checklist

Before considering setup complete:

- [ ] NPM_TOKEN configured and tested
- [ ] Branch protection rules enabled
- [ ] Team access configured
- [ ] Environments set up (optional)
- [ ] Test workflow passes
- [ ] PR checks working
- [ ] Release workflow tested
- [ ] Documentation updated

---

**🎉 Congratulations! Your FusionFlow repository is now fully configured for enterprise-grade CI/CD!**
