# TorrentManager

Personally used for torrents but works for other files too.  
Watches a target directory for files which match a regex and hardlinks them to another location using the capture groups from regex.

## Config

File named `config` in the root directory.  
Target can contain `$n` where `n` is the number of the capture group.

`"source directory" "regex" "target"`

Example:

```
"/external/downloads/linux" "archlinux-(\d+)\.(\d+)\.\d+-x86_64\.iso" "/var/www/mirror/arch/$1-$2.iso"
```
