
export default function HeroSection() {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          StreamMUSE
        </h1>
        <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
          探索AI音乐生成的前沿技术，体验不同模型在各种设置下的音乐创作能力
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href="#blind-test" 
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            开始盲测 🎵
          </a>
          <a 
            href="#audio-library" 
            className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
          >
            浏览音频库 📚
          </a>
        </div> 
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
            <div className="text-3xl mb-2">🤖</div>
            <h3 className="text-lg font-semibold mb-2">多种模型架构</h3>
            <p className="text-sm opacity-90">Xinyue&apos;s Old, New, with Chord等多种模型</p>
          </div>
          <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
            <div className="text-3xl mb-2">⚙️</div>
            <h3 className="text-lg font-semibold mb-2">参数可调节</h3>
            <p className="text-sm opacity-90">0.12B, 0.25B, 0.5B等不同参数规模</p>
          </div>
          <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
            <div className="text-3xl mb-2">🎼</div>
            <h3 className="text-lg font-semibold mb-2">MIDI可视化</h3>
            <p className="text-sm opacity-90">直观的MIDI钢琴卷帘展示</p>
          </div>
        </div>
      </div>
    </section>
  )
}
