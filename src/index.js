import { link, readFile, stat, watch } from "fs/promises";
import { join } from "path";

const configFile = await readFile("./config", "utf8");

const DEBUG = process.env.DEBUG === "true";

function debug(...args) {
  if (DEBUG) console.debug(...args);
}

const config = configFile
    .split("\n")
    .filter(Boolean)
    .filter((l) => !l.startsWith("#"))
    .map((l) =>
        l
            .match(/^(".+") (".+") (".+")$/m)
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

debug("CONFIG - ", config);

const sourcesLength = Object.values(config).length;
const linkersLength = Object.values(config).reduce((a, c) => a + c.length, 0);

function math(exp) {
    debug("MATH 1 - ", exp);

    while(exp.indexOf("(") !== -1) {
        exp = exp.replace(/\([0-9\.\-+*/ ]+\)/, e => math(e.substring(1, e.length - 1)));
    }
    debug("MATH 2 - ", exp);

    while(exp.indexOf("*") !== -1 || exp.indexOf("/") !== -1){
        exp = exp.replace(/[0-9\.]+ *[*/] *[0-9\.]+/, eval);
    }
    debug("MATH 3 - ", exp);

    while(exp.indexOf("+") !== -1 || exp.indexOf("-") !== -1){
        exp = exp.replace(/[0-9\.]+ *[+-] *[0-9\.]+/, eval);
    }
    debug("MATH 4 - ", exp, parseInt(exp));

    return parseInt(exp);
}

console.log(
    `Started with ${sourcesLength} source${
        sourcesLength > 1 ? "s" : ""
    } and ${linkersLength} linker${linkersLength > 1 ? "s" : ""}`
);

await Promise.all(
    Object.entries(config).map(async ([source, linkers]) => {
        const watcher = watch(source);
        for await (const { eventType, filename } of watcher) {
            debug("EVENT - ", source, eventType, filename);
            const srcFile = join(source, filename);
            const srcStat = await stat(srcFile).catch(() => null);
            if (eventType !== "rename" || !srcStat) continue;
            for (const { regex, target } of linkers) {
                const match = filename.match(regex);
                debug("MATCH - ", match);
                if (!match) continue;
                let targetFile = target.replace(/(?<!\\)(?:\\\\)*\$(\d+)/g, (_, i) => match[i]);
                debug("TARGET 1 - ", targetFile);
                targetFile = targetFile.replace(/(?<!\\)(?:\\\\)*\$\(([0-9\.*/+\-\(\) ]+)\)/g, (e) => math(e.substring(2, e.length - 1)));
                debug("TARGET 2 - ", targetFile);
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
