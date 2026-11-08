// ═══════════════════════════════════════════════════════════════════
// 🧪 Test della selezione degli aggiornamenti (logica API GitHub)
// ═══════════════════════════════════════════════════════════════════
import {
  selectLatestRelease,
  parseVersion,
  versionToCode,
  compareVersions,
} from '../src/utils/AppUpdater';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, extra?: any) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`, extra !== undefined ? JSON.stringify(extra) : '');
  }
}

console.log('\n── parseVersion / versionToCode ──');
check('tag con "v"', parseVersion('v1.2.3') === '1.2.3');
check('tag senza "v"', parseVersion('1.2.3') === '1.2.3');
check('tag non semver → null', parseVersion('latest') === null);
check('versionCode coerente col gradle', versionToCode('1.1.4') === 10104);

console.log('\n── confronto versioni ──');
check('1.2.0 > 1.1.9', compareVersions('1.2.0', '1.1.9') > 0);
check('1.1.4 < 1.1.5', compareVersions('1.1.4', '1.1.5') < 0);
check('1.1.4 == 1.1.4', compareVersions('1.1.4', '1.1.4') === 0);

console.log('\n── selezione del rilascio ──');
const releases = [
  { tag_name: 'v1.1.4', draft: false, prerelease: false, assets: [{ name: 'Sea-POS.apk', browser_download_url: 'u4', size: 1 }] },
  { tag_name: 'v1.1.3', draft: false, prerelease: false, assets: [] },
  { tag_name: 'latest', draft: false, prerelease: false, assets: [] },
  { tag_name: 'v2.0.0-beta', draft: false, prerelease: true, assets: [] },
  { tag_name: 'v9.9.9', draft: true, prerelease: false, assets: [] },
];

const best = selectLatestRelease(releases);
check('sceglie la versione più alta', best?.version === '1.1.4', best?.version);
check('ignora prerelease e draft', best?.version !== '2.0.0' && best?.version !== '9.9.9');
check('ignora i tag non semver', best?.version !== null);

console.log(`\n═══ Risultato: ${passed} test passati, ${failed} falliti ═══\n`);
process.exit(failed > 0 ? 1 : 0);
