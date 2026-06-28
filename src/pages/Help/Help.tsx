import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TabBar from '../../components/layout/TabBar';
import styles from './Help.module.css';

const Help: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {/* 游戏简介 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>游戏简介</h2>
          <p className={styles.paragraph}>
            英语棋（English Word Chess）是一款基于Scrabble规则的英语单词拼写对战游戏。
            玩家轮流在15×15的游戏板上放置字母块，拼出有效的英语单词来获得分数。
            游戏结合了词汇量、策略规划和空间思维能力。
          </p>
        </section>

        {/* 游戏规则 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>游戏规则</h2>
          <ol className={styles.ruleList}>
            <li>每位玩家初始有7个字母块。</li>
            <li>玩家轮流在板上放置字母块，形成有效单词。</li>
            <li>单词必须从左到右或从上到下排列。</li>
            <li>第一个单词必须经过中心星形格子。</li>
            <li>后续单词必须与板上已有的字母相连。</li>
            <li>可以使用空白块代替任意字母（不计分）。</li>
            <li>玩家可以选择跳过回合或交换字母块。</li>
            <li>游戏结束时，未使用的字母块分值将从总分中扣除。</li>
          </ol>
          <p className={styles.paragraph} style={{ marginTop: 'var(--space-2)' }}>
            <strong>本游戏提供两种对战规则，可在首页自由切换：</strong>
          </p>
          <ul className={styles.tipsList}>
            <li><strong>🚀 快速对战：</strong>字母袋共60枚（59字母+1空白），任意一方率先达到<strong>150分</strong>即获胜。</li>
            <li><strong>📜 标准对战：</strong>字母袋共100枚（98字母+2空白），字母袋耗尽或100回合上限或连续6次跳过后得分高者胜。</li>
          </ul>
        </section>

        {/* 积分规则 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>积分规则</h2>
          <p className={styles.paragraph}>
            每个字母都有对应的分数：常见字母（A, E, I, O, U, L, N, S, T, R）为1分，
            较难使用的字母（D, G）为2分，（B, C, M, P）为3分，（F, H, V, W, Y）为4分，
            （K）为5分，（J, X）为8分，（Q, Z）为10分。
          </p>
          <p className={styles.paragraph}>特殊格子的倍率会影响经过该格的字母或整个单词的分数：</p>
          <ul className={styles.scoreList}>
            <li><strong>DL（双倍字母）</strong>：该格字母分数翻倍</li>
            <li><strong>TL（三倍字母）</strong>：该格字母分数翻三倍</li>
            <li><strong>DW（双倍单词）</strong>：整个单词分数翻倍</li>
            <li><strong>TW（三倍单词）</strong>：整个单词分数翻三倍</li>
          </ul>
          <p className={styles.paragraph}>
            <strong>宾果奖励：</strong>一次用掉全部7个字母块可获得额外50分奖励！
          </p>
          <p className={styles.noteText}>
            注意：特殊格子的倍率仅在字母块第一次被放置时生效，后续回合不再计算。
          </p>

          {/* 特殊格子图例 */}
          <div className={styles.legendGrid}>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ background: 'var(--cell-dw)' }} />
              <div className={styles.legendInfo}>
                <span className={styles.legendName}>DW - 双倍单词</span>
                <span className={styles.legendDesc}>单词总分翻倍</span>
              </div>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ background: 'var(--cell-tw)' }} />
              <div className={styles.legendInfo}>
                <span className={styles.legendName}>TW - 三倍单词</span>
                <span className={styles.legendDesc}>单词总分翻三倍</span>
              </div>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ background: 'var(--cell-dl)' }} />
              <div className={styles.legendInfo}>
                <span className={styles.legendName}>DL - 双倍字母</span>
                <span className={styles.legendDesc}>单个字母分数翻倍</span>
              </div>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ background: 'var(--cell-tl)' }} />
              <div className={styles.legendInfo}>
                <span className={styles.legendName}>TL - 三倍字母</span>
                <span className={styles.legendDesc}>单个字母分数翻三倍</span>
              </div>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ background: 'var(--cell-center)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className={styles.starIcon}>★</span>
              </div>
              <div className={styles.legendInfo}>
                <span className={styles.legendName}>CENTER - 中心星</span>
                <span className={styles.legendDesc}>首个单词必经位置</span>
              </div>
            </div>
          </div>
        </section>

        {/* 操作说明 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>操作说明</h2>
          <ul className={styles.tipsList}>
            <li>点击字母架上的字母块选中，再点击棋盘空格放置。</li>
            <li>点击已放置的字母块可将其撤回字母架。</li>
            <li>点击"撤回"按钮可逐个撤回最近放置的字母块。</li>
            <li>点击"提交"按钮确认当前放置并计算得分。</li>
            <li>点击"跳过"按钮放弃当前回合。</li>
            <li>点击"提示"按钮（共3次机会）可获取AI建议的最佳放置。</li>
            <li>提交后点击得分面板中的单词可查看单词释义和发音。</li>
            <li>点击计时器旁边的暂停按钮可暂停/继续游戏。</li>
            <li>游戏结束后可下载棋盘截图和查看完整单词表。</li>
            <li>在首页可切换AI对战或玩家对战模式，选择AI难度。</li>
            <li>在单词本页面可查看已收藏的单词并进行搜索和排序。</li>
          </ul>
        </section>
      </main>

      <TabBar currentPath={location.pathname} onNavigate={(path) => navigate(path)} />
    </div>
  );
};

export default Help;
