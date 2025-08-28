import BlindTestSection from '@/components/BlindTestSection'
import AudioLibrarySection from '@/components/AudioLibrarySection'
import RankingsSection from '@/components/RankingsSection'
import HeroSection from '@/components/HeroSection'

export default function Home() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      
      <section id="blind-test" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">🎵 音乐盲测挑战</h2>
            <p className="text-lg text-gray-600">
              聆听两个模型生成的音乐，选择你认为更好的一个。你的投票将帮助我们改进模型！
            </p>
          </div>
          <BlindTestSection />
        </div>
      </section>

      <section id="rankings" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">🏆 实时排行榜</h2>
            <p className="text-lg text-gray-600">
              基于用户投票的模型性能排名，实时更新
            </p>
          </div>
          <RankingsSection />
        </div>
      </section>

      <section id="audio-library" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">🎵 音频展示库</h2>
            <p className="text-lg text-gray-600">
              浏览我们的音频库，按模型、参数、数据集等维度筛选和比较
            </p>
          </div>
          <AudioLibrarySection />
        </div>
      </section>
    </main>
  )
}
