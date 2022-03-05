import { link, readFile, stat, watch } from "fs/promises";
import { join } from "path";

const configFile = await readFile("./config", "utf8");

const config = configFile
    .split("\n")
    .filter(Boolean)
    .filter((l) => !l.startsWith("#"))
    .map((l) =>
        l
            .match(/(".+") (".+") (".+")/)
            .splice(1, 3)
            .map((s) => s.slice(1, -1))
    )
    .reduce((conf, [source, regexString, target]) => {
        if (!conf[source]) conf[source] = [];
        conf[source].push({
            regex: new RegExp(regexString, "m"),
            target,
        });
        return conf;
    }, {});

const sourcesLength = Object.values(config).length;
const linkersLength = Object.values(config).reduce((a, c) => a + c.length, 0);

console.log(
    `Started with ${sourcesLength} source${
        sourcesLength > 1 ? "s" : ""
    } and ${linkersLength} linker${linkersLength > 1 ? "s" : ""}`
);

await Promise.all(
    Object.entries(config).map(async ([source, linkers]) => {
        const watcher = watch(source);
        for await (const { eventType, filename } of watcher) {
            const srcFile = join(source, filename);
            const srcStat = await stat(srcFile).catch(() => null);
            if (eventType !== "rename" || !srcStat) continue;
            for (const { regex, target } of linkers) {
                const match = filename.match(regex);
                if (!match) continue;
                const targetFile = target.replace(/(?<!\\)(?:\\\\)*\$(\d+)/g, (_, i) => match[i]);
                const targetStat = await stat(targetFile).catch(() => null);
                if (!targetStat) {
                    await link(srcFile, targetFile);
                    console.log(`Linked '${srcFile}' to '${targetFile}'`);
                } else
                    console.log(
                        `Skipped linking '${srcFile}' to '${targetFile}' because target already exists'`
                    );
            }
        }
    })
);
