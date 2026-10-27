# Deploy Habit Tracker with Ansible

This directory deploys the current local application files to the Docker VM. It builds and starts the container with the existing `docker-compose.yml`.

The separate infrastructure project prepares the VM and installs Docker. This playbook does not install Docker and does not change the VM firewall.

## Data and access

- Application files are copied to `/opt/habit-tracker`.
- Local database files, `.env` files, `node_modules`, build output, and the source workbook are not copied.
- SQLite stays in the Docker named volume `habit-tracker-data`. Redeployment does not delete this volume.
- The application remains bound to `127.0.0.1:3000` on the VM. Use an SSH tunnel because authentication is not implemented.

## 1. Create the inventory

Run from the project root:

```sh
cd ansible
cp inventory.ini.example inventory.ini
```

Edit `inventory.ini`:

```ini
[docker]
docker ansible_host=192.168.5.50 ansible_user=kovaxs
```

Replace the IP address with the Docker VM address. Use the private SSH key that corresponds to the VM user's authorized public key. If SSH cannot find it automatically, add:

```ini
ansible_private_key_file=/absolute/path/to/id_ed25519
```

No Proxmox API key is used by this deployment.

## 2. Set the time zone

The default is UTC. To change it, edit `group_vars/docker.yml`:

```yaml
habit_tracker_timezone: Europe/Madrid
```

Use an IANA time-zone name.

## 3. Deploy

Check the SSH connection:

```sh
ansible docker -m ping
```

Check and run the playbook:

```sh
ansible-playbook deploy.yml --syntax-check
ansible-playbook deploy.yml
```

The playbook builds the Docker image on the VM. It then waits for an HTTP 200 response on the VM loopback address.

## 4. Open the application

Create an SSH tunnel on your workstation:

```sh
ssh -L 3000:127.0.0.1:3000 kovaxs@<vm-ip>
```

Keep that session open. Open <http://127.0.0.1:3000> in your browser.

## Redeploy and inspect

After changing local application files, run:

```sh
ansible-playbook deploy.yml
```

Inspect the container on the VM:

```sh
ssh kovaxs@<vm-ip>
cd /opt/habit-tracker
docker compose ps
docker compose logs --tail=100
```

Do not publish logs that contain personal habit records.
