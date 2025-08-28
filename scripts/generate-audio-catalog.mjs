// import fs from 'fs';
// import path from 'path';

// // 定义源目录和目标文件路径
// const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');
// const OUTPUT_FILE = path.join(process.cwd(), 'public', 'metadata', 'audio_catalog.json');

// // 递归扫描函数
// function scanDirectory(dir) {
//   const allFiles = [];

//   function walk(currentDir) {
//     const files = fs.readdirSync(currentDir, { withFileTypes: true });
//     for (const file of files) {
//       const fullPath = path.join(currentDir, file.name);
//       if (file.isDirectory()) {
//         walk(fullPath);
//       } else if (file.name.endsWith('.mid')) {
//         allFiles.push(fullPath);
//       }
//     }
//   }

//   walk(dir);
//   return allFiles;
// }

// console.log('🔍 Starting to scan audio directory...');
// const audioFilePaths = scanDirectory(AUDIO_DIR);
// console.log(`✅ Found ${audioFilePaths.length} MIDI files.`);

// const audioCatalog = audioFilePaths.map((filePath, index) => {
//   // 从文件路径中解析元数据
//   const relativePath = path.relative(AUDIO_DIR, filePath);
//   const parts = relativePath.split(path.sep);
//   const [model, params, dataset, mode, filename] = parts;

//   // 简单处理一下参数，例如 '012b' -> '0.12b'
//   const formattedParams = `${params.slice(0, 1)}.${params.slice(1)}`;
  
//   // --- 新增：从文件名解析详细信息 ---
//   let prompt_length = 'unknown';
//   let generation_length = 'unknown';
//   let prompt_file = 'unknown';
//   let input_file = 'unknown';
//   let temperature = 0.8; // 默认值

//   // 定义正则表达式来匹配您的文件名规范
//   // 格式: <mode_type>_tem_<temperature>_prompt_<prompt_id>_<prompt_length>_input_<input_id>_<input_length/generate_length>_<version>.mid
//   // 示例: offline_tem_1.0_prompt_001_100t_input_002_200t_001.mid
//   const filenameRegex = /_tem_([\d.]+)_prompt_(\w+)_(\w+)_input_(\w+)_(\w+)_/;
//   const match = filename.match(filenameRegex);

//   if (match) {
//     // 如果匹配成功，则提取信息
//     // match[0]是完整匹配的字符串，我们从match[1]开始取
//     temperature = parseFloat(match[1]); // eg. 1.0
//     prompt_file = match[2];           // eg. 001
//     prompt_length = match[3];         // eg. 100t
//     input_file = match[4];            // eg. 002
//     generation_length = match[5];     // eg. 200t
//   } else {
//     console.warn(`⚠️ Filename did not match expected format: ${filename}`);
//   }
//   // --- 解析结束 ---

//   return {
//     id: `audio_${index + 1}`,
//     filename: filename,
//     midi_url: `/audio/${relativePath.replace(/\\/g, '/')}`, // 确保是Web路径格式
//     metadata: {
//       model_architecture: model,
//       model_parameters: formattedParams,
//       training_dataset: dataset,
//       inference_mode: mode,
//       // 使用从文件名中解析出的值
//       prompt_length: prompt_length,
//       generation_length: generation_length,
//       prompt_file: prompt_file,
//       input_file: input_file,
//     },
//     audio_info: {
//       duration: 30, 
//       file_size: 'N/A',
//       format: 'midi',
//     },
//     generation_params: {
//       // 使用从文件名中解析出的值
//       temperature: temperature,
//       top_p: 0.9,
//       seed: 1234,
//     },
//     evaluation: {
//       votes: 0,
//       elo_rating: 1500,
//       total_comparisons: 0,
//     },
//     created_at: new Date().toISOString(),
//   };
// });

// console.log('📦 Writing to audio_catalog.json...');
// fs.writeFileSync(OUTPUT_FILE, JSON.stringify(audioCatalog, null, 2));
// console.log('✨ Success! Catalog generated.');

import fs from 'fs';
import path from 'path';

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'metadata', 'audio_catalog.json');

function scanDirectory(dir) {
  const allFiles = [];
  function walk(currentDir) {
    const files = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(currentDir, file.name);
      if (file.isDirectory()) {
        walk(fullPath);
      } else if (file.name.endsWith('.mid')) {
        allFiles.push(fullPath);
      }
    }
  }
  walk(dir);
  return allFiles;
}

console.log('🔍 Starting to scan audio directory...');
const audioFilePaths = scanDirectory(AUDIO_DIR);
console.log(`✅ Found ${audioFilePaths.length} MIDI files.`);

// --- 核心改动：从扁平列表改为分组 ---
const audioGroups = new Map();

audioFilePaths.forEach((filePath, index) => {
  const relativePath = path.relative(AUDIO_DIR, filePath);
  const parts = relativePath.split(path.sep);
  const [model, params, dataset, mode, filename] = parts;
  const formattedParams = `${params.slice(0, 1)}.${params.slice(1)}`;
  
  // 更新正则表达式以捕获 version
  const filenameRegex = /_tem_([\d.]+)_prompt_(\w+)_(\w+)_input_(\w+)_(\w+)_(\w+)\.mid$/;
  const match = filename.match(filenameRegex);

  if (!match) {
    console.warn(`⚠️ Filename did not match expected format, skipping: ${filename}`);
    return; // 跳过不符合格式的文件
  }

  const temperature = parseFloat(match[1]);
  const prompt_file = match[2];
  const prompt_length = match[3];
  const input_file = match[4];
  const generation_length = match[5];
  const version = match[6]; // 新增：捕获version

  // --- 分组逻辑 ---
  // 创建一个不包含 temperature 和 version 的唯一ID，用于分组
  const groupId = `${model}-${formattedParams}-${dataset}-${mode}-${prompt_file}-${prompt_length}-${input_file}-${generation_length}`;
  
  const audioInstance = {
    id: `audio_${index + 1}`,
    filename,
    midi_url: `/audio/${relativePath.replace(/\\/g, '/')}`,
    version, // 新增
    audio_info: { duration: 30, file_size: 'N/A', format: 'midi' },
    generation_params: { temperature, top_p: 0.9, seed: 1234 },
    evaluation: { votes: 0, elo_rating: 1500, total_comparisons: 0 },
    created_at: new Date().toISOString(),
  };

  if (!audioGroups.has(groupId)) {
    // 如果是这个组的第一个文件，创建组
    audioGroups.set(groupId, {
      groupId,
      sharedMetadata: {
        model_architecture: model,
        model_parameters: formattedParams,
        training_dataset: dataset,
        inference_mode: mode,
        prompt_length,
        generation_length,
        prompt_file,
        input_file,
      },
      instances: [],
    });
  }
  // 将当前文件实例添加到对应的组中
  audioGroups.get(groupId).instances.push(audioInstance);
});

// 将 Map 转换为数组，并计算每个组可用的 temperatures 和 versions
const finalCatalog = Array.from(audioGroups.values()).map(group => {
  const temps = new Set(group.instances.map(inst => inst.generation_params.temperature));
  const versions = new Set(group.instances.map(inst => inst.version));
  
  return {
    ...group,
    availableTemperatures: Array.from(temps).sort((a, b) => a - b),
    availableVersions: Array.from(versions).sort(),
  };
});


console.log('📦 Writing grouped audio_catalog.json...');
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalCatalog, null, 2));
console.log(`✨ Success! Generated ${finalCatalog.length} audio groups.`);