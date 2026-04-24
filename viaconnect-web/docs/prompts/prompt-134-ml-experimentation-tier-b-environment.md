# Prompt #134 — ML Experimentation Tier B Environment Migration

**Project:** ViaConnect™ GeneX360™ Precision Wellness Platform
**Company:** FarmCeutica Wellness LLC
**Owner:** Gary Ferenczi, CEO & Founder
**Classification:** Environment governance / Credential isolation
**Parent prompts:** Prompt #129 (parent policy, especially §4.2), #129a, #131, #132
**Fulfills:** Item 8 of §9 Implementation Checklist of Prompt #129 ("Migrate Gary's ML experimentation work off `C:\Users\garyf\ViaConnect2026\` to a Tier B isolated environment")
**Status:** Active — establishes the Tier B environment specification and migration procedure for Gary's ML experimentation
**Bundle ID affected:** com.farmceutica.viaconnect (by separation, not by modification)

---

## 1. Purpose & Scope

Prompt #129 §4.2 defines Tier B as "cloned to an isolated environment that has no network or filesystem path to ViaConnect credentials, Supabase keys, Vercel tokens, Claude API keys, HeyGen credentials, or any `.env*` file belonging to FarmCeutica projects." The policy was written but no specific Tier B environment has yet been provisioned for Gary's personal use.

Gary's current working environment at `C:\Users\garyf\` simultaneously holds:

- The ViaConnect repository at `C:\Users\garyf\ViaConnect2026\viaconnect-web\`
- Production Supabase service-role keys (in `.env.local` or equivalent)
- Vercel deployment tokens (in the Vercel CLI configuration)
- Claude API keys (in environment variables and/or config files)
- HeyGen and Tavus credentials for Hannah's avatar integration
- The Windows user profile (`garyf`) with its associated SSH keys, Git credentials, browser session cookies, and cloud-storage auth tokens

Running any external ML repository — Karpathy-style educational code, Hugging Face example notebooks, community PyTorch implementations, open-source RL frameworks — within this same user profile means that a single compromised install script can read, exfiltrate, or corrupt any of the above. The probability of such a compromise scales with (a) the count of external repositories experimented with, (b) the depth of each repository's transitive dependency tree, and (c) the frequency with which experimental dependencies are installed and updated.

This prompt establishes the specific Tier B environment Gary will use for ML experimentation going forward, the migration procedure for any existing ML work currently on the main profile, and the ongoing discipline required to maintain the isolation boundary.

The scope is limited to **ML experimentation specifically**. Other external-code interactions (web browsing for reference, reading GitHub repos in a browser, etc.) remain Tier A and do not require this environment.

---

## 2. Current-State Risk Assessment

### 2.1 What is on the main profile

The main Windows profile `C:\Users\garyf\` is a multi-purpose working environment combining:

| Category | Content |
|---|---|
| Production credentials | Supabase service-role key (project `nnhkcufyqjojdbvdrpky`), Vercel deploy tokens, Claude API keys, HeyGen/Tavus tokens |
| Production code | ViaConnect repository, app-store foundation commit `be3a5ee`, Prompt #116 LCMS, Hounddog Admin Dashboard |
| Personal identity | `gary@farmceuticawellness.com` logged-in sessions, SSH keys, Git credentials |
| FarmCeutica business | Google Drive sync, email, financial data, Thomas/Domenic/Steve/Dr. Fadi communications |
| Experimental surface | Any ML code, npm packages, Python environments, Conda envs, research notebooks |

The blast radius of any compromise on this profile includes regulatory-sensitive health data (ViaConnect CAQ responses, genetic panels), production deployment authority (Vercel tokens allow code push to the live customer site), and personal/business identity (email, banking, Google Drive).

### 2.2 Attack scenarios this migration prevents

Several concrete scenarios, drawn from actual 2024–2025 incidents:

1. **Install-script exfiltration.** A cloned ML repo has a `setup.py` that reads `process.env` / `os.environ` on install and POSTs the contents to an attacker-controlled URL. Supabase service-role key, Vercel token, and Claude API key all exfiltrated in a single `pip install` or `npm install`. (Pattern: ua-parser-js, @ctrl/tinycolor, Shai-Hulud.)

2. **Pickle-loading arbitrary code execution.** A downloaded model weights file (`.pt`, `.pkl`) contains a custom `__reduce__` method that executes arbitrary Python on `torch.load()`. Without `weights_only=True`, the attacker gets a full shell in Gary's user context — filesystem access, credential access, SSH access. (Pattern: documented for years; modern PyTorch defaults improve this but tutorial code often doesn't use the safe flag.)

3. **Dependency-confusion attack.** An ML repo's `requirements.txt` references an internal-sounding package name; an attacker has published a higher-version public package with that name; `pip` installs the attacker's package, which exfiltrates credentials on import.

4. **Browser-context credential theft.** An installed VSCode extension (bundled with an ML repo's development instructions) reads saved browser credentials, SSH keys, and Git credentials from the Windows Credential Manager.

5. **Ransomware / wipeware.** A "protestware" or sabotage payload in an ML library wipes or encrypts the working directory — which on Gary's current profile includes the ViaConnect repository.

Each of these is an actual, observed attack pattern within the last 24 months. Tier B isolation removes the credential and production-code targets from the attack surface.

### 2.3 What Tier B does not protect against

Tier B is not a complete security solution. It does not protect against:

- Attacks originating in ViaConnect's own production dependency tree (addressed by Prompt #133)
- Social engineering targeting Gary directly (phishing, voice cloning, business email compromise)
- Compromise of FarmCeutica's Google Workspace, Supabase, Vercel, or other SaaS accounts via their own interfaces
- Physical access to the machine

Tier B specifically addresses the "I want to try this interesting open-source ML repo and my working directory has production keys" scenario.

---

## 3. Target-State Specification

### 3.1 Requirements derived from Prompt #129 §4.2

The Tier B environment must satisfy all of the following:

1. **No network or filesystem path to ViaConnect credentials.** The environment cannot read `.env*` files from `C:\Users\garyf\ViaConnect2026\` or any other FarmCeutica project directory.
2. **No shared Git remote.** The environment does not have push access to any FarmCeutica-owned GitHub repository. Read access to public repositories is fine.
3. **No shared SSH identity.** The environment's SSH keys are distinct from Gary's main-profile keys. The environment cannot SSH into any FarmCeutica infrastructure.
4. **No authenticated session to FarmCeutica identities.** The environment does not have `gary@farmceuticawellness.com` signed in to any browser or cloud service.
5. **Treated as compromised by default.** Any code executed in the environment is assumed potentially malicious. Nothing from the environment is trusted to run on the main profile.
6. **Clipboard discipline.** Copy-paste from the environment to the main profile is prohibited per Prompt #129 §4.2. If a pattern is discovered worth bringing to ViaConnect, it goes through the Tier C re-derivation pipeline (Sherlock → Michelangelo), not a clipboard transfer.

### 3.2 Additional requirements for practical operation

7. **Must be usable.** The environment must be convenient enough that Gary actually uses it rather than falling back to the main profile. Friction kills security hygiene; if Tier B takes 20 minutes to spin up, it won't get used.
8. **Must support common ML toolchains.** Python 3.10+, PyTorch, NumPy/SciPy/Pandas, Jupyter, a modern CUDA if GPU access is desired, Git.
9. **Must survive Gary rebooting his machine.** State persistence across sessions is valuable; a fresh clean-slate VM on every reboot is not workable for multi-session experimentation.
10. **Must be backed up or easily rebuilt.** If the environment is compromised, Gary needs to be able to tear it down and rebuild without losing days of notes or intermediate results.

---

## 4. Environment Options

Four realistic options, ranked in order of recommendation for Gary's Windows setup:

### 4.1 Option 1 (Recommended) — WSL2 with Dedicated User

A second user account within WSL2, separate from any existing WSL2 user, configured without access to Windows-side credential stores.

**Pros:**

- Low friction: `wsl -d Ubuntu-ML -u mluser` (or similar) from any Windows terminal
- Full Linux environment, well-suited to ML toolchains
- State persists across reboots
- GPU passthrough works (CUDA-on-WSL2 is mature in 2026)
- Easy to tear down and rebuild via `wsl --unregister` + re-install
- No additional licensing cost
- Can use PyCharm / VSCode / Cursor on the Windows side with remote attach into WSL2 (with explicit care about what files are mounted)

**Cons:**

- WSL2 by default mounts the Windows filesystem at `/mnt/c/` which defeats the isolation if not configured away. This requires explicit mitigation.
- Windows credential manager access from WSL2 is possible via certain tools; must verify none are installed.
- Shared network stack with the host — attacker in the WSL2 instance sees the local network.

**Mitigations for the cons:**

- Configure `/etc/wsl.conf` with `[automount] enabled = false` to disable auto-mounting of `C:\`. If a specific file needs to transit, use explicit `wsl --cd` or file copy.
- Install no Windows-side integration tools (`wslu`, `clip.exe` forwarders) in the ML WSL2 instance.
- Configure Windows Firewall to restrict WSL2 instance's network access to egress only; no inbound connections from the WSL2 instance to Windows-side services (Supabase local CLI, local dev servers, etc.).

### 4.2 Option 2 — Hyper-V or VirtualBox VM

A full virtual machine with its own kernel, memory, and storage.

**Pros:**

- Stronger isolation than WSL2 (separate kernel, no filesystem sharing by default)
- Full Linux desktop if desired (for Jupyter notebooks in a browser, etc.)
- Snapshots before risky experiments
- Complete network isolation is trivial

**Cons:**

- Higher friction: boot time, resource allocation (RAM, disk), GPU passthrough is more complex on consumer hardware
- More setup steps
- Heavier on Gary's machine resources (RAM in particular)

### 4.3 Option 3 — Separate Windows User Account

A second Windows user `garyf-ml` with no access to `garyf`'s home directory or Windows Credential Manager entries.

**Pros:**

- Zero additional software required
- Familiar Windows environment

**Cons:**

- Windows user isolation is weaker than VM-level isolation (shared kernel, same Windows Credential Manager surface, malware can often escalate)
- Not well-suited to ML toolchains (most ML tutorials assume Linux)
- Requires fast user switching or separate login sessions — high friction

### 4.4 Option 4 — GitHub Codespaces or Cloud Sandbox

Ephemeral cloud-hosted development environment.

**Pros:**

- Strongest isolation (physically separate machine)
- No local resource consumption
- Easy to tear down

**Cons:**

- Requires internet connectivity for every session
- Billing/quota implications
- GPU access is limited or costly
- Secrets explicitly set on the Codespace are still exfiltrable — the isolation is physical but the authentication boundary depends on what secrets are configured
- **Critical:** must NOT have `gary@farmceuticawellness.com` authenticate to the Codespace

### 4.5 Recommendation

**Option 1 (WSL2 with dedicated user)** is recommended for Gary's situation because the combination of low friction, full ML toolchain support, state persistence, and zero licensing cost makes it the option most likely to actually get used. The filesystem-mount risk is mitigated by explicit configuration.

If Gary prefers stronger isolation and can accept the friction, Option 2 (Hyper-V VM) is a reasonable alternative. Options 3 and 4 are not recommended as primary Tier B environments but may have roles in specific situations (Codespaces for one-off cloud experiments, separate Windows user for non-ML isolation needs).

The remainder of this prompt assumes Option 1 unless Gary selects otherwise in the prompt thread. If Gary selects Option 2, 3, or 4, a follow-on prompt (#134a) would adapt §§5–7 accordingly.

---

## 5. Setup Procedure (Option 1 — WSL2)

### 5.1 Preconditions

- WSL2 is already installed on Gary's Windows machine (assumed based on typical dev setup).
- Gary has administrator privileges on the Windows machine (required for WSL2 distro management).
- Gary approves this prompt and selects Option 1 (or Claude Code proceeds by default per §4.5).

### 5.2 Create a dedicated WSL2 distribution

A dedicated distro — separate from any existing WSL2 Ubuntu that may already be in use for ViaConnect development — provides a clean isolation boundary.

1. Open an elevated PowerShell on Windows.
2. Install a fresh Ubuntu distribution under a distinct name: `wsl --install -d Ubuntu-24.04 --name Ubuntu-ML` (verify current WSL2 command syntax; in 2026 the `--name` flag may have changed).
3. On first launch, create a new Linux user `mluser` (**NOT** `garyf` or any other FarmCeutica-identity name). Use a new password that is not used elsewhere.
4. Do NOT configure the new user's email or Git identity to `gary@farmceuticawellness.com`. If Git is needed, configure a placeholder like `mluser@localhost` or an explicit throwaway identity.

### 5.3 Lock down filesystem mounts

In the new WSL2 instance, edit `/etc/wsl.conf` as root:

````ini
# /etc/wsl.conf in Ubuntu-ML
# Authored in Prompt #134 §5.3 of ViaConnect Prompt Library
# Purpose: disable auto-mounting of the Windows filesystem to prevent
# accidental credential access from ML experimentation context.

[automount]
enabled = false
mountFsTab = false

[interop]
enabled = false
appendWindowsPath = false

[boot]
systemd = true
````

From elevated PowerShell on Windows, shut down and restart the WSL2 instance for the config to take effect: `wsl --terminate Ubuntu-ML` then `wsl -d Ubuntu-ML`.

Verify the mount is gone: inside Ubuntu-ML, `ls /mnt/` should show nothing (or only expected filesystems, not `c`, `d`, etc.).

Verify Windows paths are inaccessible: `cat /mnt/c/Users/garyf/ViaConnect2026/viaconnect-web/.env.local` must return "No such file or directory."

### 5.4 Install ML toolchain

Inside Ubuntu-ML as `mluser`:

1. Update packages: `sudo apt update && sudo apt upgrade -y`
2. Install build essentials: `sudo apt install -y build-essential git python3-pip python3-venv curl`
3. Install a Python version manager — `pyenv` is recommended for flexibility across tutorial-code Python versions. Follow pyenv's official documentation at install time; do not copy-paste installer shell scripts without verifying against the official README.
4. Install `nvidia-smi` compatibility for GPU access if CUDA experimentation is planned. Follow Microsoft's current CUDA-on-WSL2 documentation.
5. For each ML experiment, create a dedicated Python virtual environment or Conda environment. Never install experimental packages into the system Python.

### 5.5 SSH and Git identity

1. Generate a new SSH keypair in the Ubuntu-ML instance: `ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_mluser -C "mluser@ml-sandbox"`.
2. Do NOT add this key to Gary's GitHub account, the FarmCeutica organization, or any FarmCeutica-adjacent service.
3. If a GitHub account is needed for Tier B experimentation (e.g., to fork public repos for hands-on modification), create a new GitHub account (e.g., `garyf-ml-sandbox`) with a distinct email not at the `farmceuticawellness.com` domain. This account has no access to FarmCeutica repositories.
4. Configure Git globally in Ubuntu-ML with the sandbox identity only.

### 5.6 Verification of isolation

From within Ubuntu-ML:

1. `cat /mnt/c/Users/garyf/.env` — should fail (no such path).
2. `ping vercel.com` succeeds (egress internet works) but `curl http://localhost:3000` targeting any Windows-side local dev server fails (or is explicitly blocked).
3. `printenv | grep -i supabase` returns nothing.
4. `printenv | grep -i anthropic` returns nothing.
5. `printenv | grep -i vercel` returns nothing.
6. `git config --global user.email` shows the sandbox email, NOT `gary@farmceuticawellness.com`.
7. `ssh -T git@github.com` authenticates as the sandbox identity, NOT Gary's main identity.

All verifications must pass. Any failure is blocker-level — the environment is not isolated and must be corrected before use.

---

## 6. Migration of Existing ML Work

### 6.1 Inventory

Before migration, Gary enumerates any existing ML experimentation on the main profile. Typical locations:

- `C:\Users\garyf\Documents\` subfolders with notebooks
- `C:\Users\garyf\ml\`, `C:\Users\garyf\experiments\`, or similar
- Any Conda envs under `C:\ProgramData\miniconda3\envs\` or user-local equivalents
- Any pip-installed packages in the global user pip cache
- Downloaded model weights, datasets, or `.pt`/`.pkl` files anywhere on disk
- VSCode or Cursor workspaces dedicated to ML experimentation

### 6.2 Move-vs-rebuild decision

For each item on the inventory, decide:

- **Move** (copy into Ubuntu-ML, delete from main profile) — for Gary-authored notebooks, notes, results that are not external-code artifacts. Moving these is safe.
- **Rebuild** (do not copy; recreate in Ubuntu-ML from scratch) — for any external repo clones, their dependencies, their downloaded weights. These are assumed potentially compromised (or at least not verified) on the main profile; recreating in Tier B re-establishes the isolation.
- **Discard** — for anything no longer needed; use as an opportunity to declutter.

### 6.3 Transfer mechanism

For "Move" items, use a Windows-side copy to a temporary location, then transfer to Ubuntu-ML via one of:

- `wsl --cd` with a one-time mount to read the specific file (re-disable mount immediately after)
- USB stick or cloud-storage interchange if paranoid about direct WSL2 mount even once
- Re-type or re-export the content if small (notebooks can be exported as `.py` or `.ipynb` and recreated)

Do not batch-copy entire directories. Move items one at a time, verifying each is Gary-authored content and not accidentally including credentials or external-code artifacts.

### 6.4 Credential audit after migration

After migration is complete, audit the main profile to ensure:

- No copies of ViaConnect `.env.local` exist outside the `ViaConnect2026` directory
- No ML-experimentation side effects (pip-installed packages in global environment, environment variables pointing to downloaded model locations, etc.) remain on the main profile
- Any VSCode extensions or Cursor plugins installed specifically for ML work are removed from the main profile's editor and reinstalled (if desired) in the Ubuntu-ML context

---

## 7. Boundary Discipline

### 7.1 What crosses the boundary

| Direction | Content | Permitted? |
|---|---|---|
| Main → Ubuntu-ML | Gary-authored notes, one-off files to use as input data | Yes, one at a time, through explicit transfer |
| Main → Ubuntu-ML | ViaConnect credentials, `.env*`, SSH keys, tokens | Never |
| Main → Ubuntu-ML | ViaConnect source code | Never — ML experiments do not need it |
| Ubuntu-ML → Main | Experimental results, plots, summaries (as text or exported files) | Yes, manually, with explicit transfer |
| Ubuntu-ML → Main | Cloned external repo source code | Never — this is Tier D |
| Ubuntu-ML → Main | Claude-Code-edited files for ViaConnect | Never — Claude Code runs on the main profile only |

### 7.2 What "transfer" means in practice

A transfer is an explicit Gary action — open a file, read it, retype or export the content, save it in the other environment. It is not a shared folder, not a clipboard sync, not a networked drive. Automation of transfers is prohibited because automation defeats the friction that enforces discipline.

### 7.3 What never transfers

- External repository source code from Ubuntu-ML → main. If a pattern from a Tier B experiment is worth bringing to ViaConnect, it becomes a Tier C re-derivation: Gary writes a prompt describing the pattern in his own words, Sherlock evaluates the source repo, Michelangelo re-derives in-ViaConnect per #129 §4.
- Authentication tokens, API keys, or credentials in either direction.
- Downloaded model weights, pickled objects, or datasets in either direction.

### 7.4 Interaction with Claude Code and Jeffery

Claude Code runs on the main profile and operates on the ViaConnect repository. Claude Code does NOT enter the Ubuntu-ML environment. Jeffery's orchestration layer does not dispatch work into Ubuntu-ML. The Tier B environment is explicitly outside the multi-agent system's operational surface.

If Gary wants Claude Code's help with an ML experiment, the correct pattern is:

1. Gary experiments in Ubuntu-ML, achieves a result he wants to capture as a pattern
2. Gary writes a description of the pattern (in natural language, not code copied from the experiment)
3. In a main-profile Claude Code session, Gary dispatches a prompt that describes the pattern and asks for a ViaConnect implementation
4. Sherlock evaluates the source external repo (Tier A browser reference)
5. Michelangelo re-derives the pattern in ViaConnect idioms

This preserves the isolation boundary at every step.

---

## 8. Verification Checklist

After setup and migration:

1. Ubuntu-ML distribution exists and boots (`wsl -l -v` shows Ubuntu-ML).
2. `/etc/wsl.conf` contains the lockdown configuration in §5.3.
3. `/mnt/c/Users/garyf/` is inaccessible from within Ubuntu-ML.
4. `printenv` in Ubuntu-ML contains no Supabase, Anthropic, Vercel, HeyGen, or Tavus tokens.
5. `git config --global user.email` in Ubuntu-ML shows the sandbox identity.
6. The sandbox GitHub account (if created) has no access to any FarmCeutica-owned repository.
7. Any "Move" items from §6.2 have been transferred and originals removed from the main profile.
8. Any "Rebuild" items have been recreated in Ubuntu-ML and originals deleted from the main profile.
9. The main profile has no lingering ML-experimentation artifacts that predate migration.
10. Gary has used Ubuntu-ML for at least one small real experiment to confirm the environment is genuinely usable and not just theoretically correct.

---

## 9. Rollback / Teardown Procedure

### 9.1 Teardown because the environment was compromised

1. From elevated PowerShell on the main profile: `wsl --unregister Ubuntu-ML`. This destroys the entire distribution instantly.
2. Any files Gary wants to preserve must be manually exported before teardown.
3. Rebuild per §5 into a new distribution (`Ubuntu-ML2` or similar) to avoid any possible residual artifact.

### 9.2 Teardown because a different Tier B environment is being adopted

1. Preserve Gary-authored notes by manual export.
2. Teardown per §9.1.
3. New prompt (e.g., #134a) documents the change of Tier B environment.

### 9.3 Restoration in case of accidental destruction

If Ubuntu-ML is destroyed accidentally (wrong `wsl --unregister` command, disk corruption, etc.), there is no automatic restore. Rebuild per §5. This is an acceptable property for an experimentation environment and part of the reason §3.2 requirement 10 emphasized "easily rebuilt" over "backed up."

---

## 10. Ongoing Discipline

### 10.1 Monthly hygiene

Once a month Gary (or Claude Code on the main profile, invoked by Gary) performs:

- Verify `/etc/wsl.conf` has not been modified since setup.
- Verify no FarmCeutica-adjacent credentials have been configured in Ubuntu-ML (re-run the §5.6 verifications).
- Review the list of installed Python packages and remove any no longer in active use (reduces latent compromise surface).
- Rotate the `mluser` password if not rotated in the last 90 days.

### 10.2 Before adopting a new ML repo

Even within Tier B, some repos warrant extra caution:

- Check the repo's `setup.py` / `package.json` / install scripts before running them
- Load any model weights with `weights_only=True` (PyTorch ≥ 1.13)
- Do not install packages into the shared environment; use a per-experiment virtualenv or Conda env
- If the repo is particularly sketchy, run it inside a container within Ubuntu-ML for a second layer of isolation

### 10.3 Red flags that require returning to this prompt

If any of the following occur, revisit §9 (teardown) and this prompt's review cadence:

- Gary finds himself copy-pasting experimental code to the main profile "just this once"
- The Ubuntu-ML environment develops network access to FarmCeutica resources
- An experiment accidentally authenticates Ubuntu-ML to `gary@farmceuticawellness.com` (e.g., via a browser login)
- A credential is exported from the main profile into Ubuntu-ML for any reason

Each of these is an isolation breach. The response is teardown-and-rebuild, not "I'll be careful next time."

---

## 11. Document Control

| Field | Value |
|---|---|
| Prompt number | 134 |
| Title | ML Experimentation Tier B Environment Migration |
| Parent prompts | #129 (especially §4.2), #129a, #131, #132 |
| Author | Claude (under Gary Ferenczi's direction) |
| Date | 2026-04-24 |
| Delivery formats | `.md`, `.docx` |
| Destination | ViaConnect Prompt Library (Google Drive) |
| Fulfills | Item 8 of §9 of Prompt #129 |
| Recommended environment | Option 1 — WSL2 with dedicated user `mluser` in distribution `Ubuntu-ML` |
| Alternative environments documented | Option 2 (VM), Option 3 (separate Windows user), Option 4 (Codespaces) |
| Classification | Environment governance / Credential isolation |
| Successor(s) anticipated | Prompt #134a only if environment choice changes; otherwise none |

---

## 12. Acknowledgment

By approving this prompt and executing §§5–6, Gary acknowledges that ML experimentation will be conducted in the Tier B Ubuntu-ML environment going forward, that no ML-experimentation artifacts (external repo clones, downloaded weights, experimental dependencies) will be introduced onto the main profile `C:\Users\garyf\` after migration, that the boundary discipline in §7 is binding, and that Tier C re-derivation via Sherlock → Michelangelo is the only pathway by which patterns discovered in Tier B can enter the ViaConnect codebase.
