export const C = {
  bg: '#0B1520',
  surface: '#0F1C2D',
  card: '#132336',
  card2: '#172840',
  border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.13)',
  teal: '#2DA5A0',
  orange: '#E8803A',
  red: '#E84545',
  green: '#27C97A',
  blue: '#4B9EFF',
  purple: '#9B6DFF',
  text: '#EDF2FF',
  muted: 'rgba(255,255,255,0.38)',
  muted2: 'rgba(255,255,255,0.58)',
} as const

export interface AgentDef {
  name: string
  icon: string
  color: string
  status: 'live' | 'idle'
  task: string
  progress: number
}

export const AGENTS: AgentDef[] = [
  { name: 'Scriptwriter', icon: 'PenTool', color: C.teal, status: 'live', task: "Drafting 10 hook variations for 'AI replaced my team'", progress: 67 },
  { name: 'Editor', icon: 'Edit3', color: C.blue, status: 'live', task: "Last: Approved 'Morning Routine' \u2014 3 edits flagged", progress: 42 },
  { name: 'Scheduler', icon: 'Calendar', color: C.purple, status: 'live', task: '12 posts queued for next 7 days. Optimal window: 6:30 PM weekdays', progress: 88 },
  { name: 'Analyzer', icon: 'BarChart2', color: C.orange, status: 'idle', task: 'Processing 30-day engagement data across 6 platforms', progress: 15 },
]

export interface PlatformDef {
  name: string
  color: string
  posts: number
  eng: number
  reach: string
  saves: string
  growth: string
  live: boolean
  sparkData: number[]
}

export const PLATFORMS: PlatformDef[] = [
  { name: 'TikTok', color: '#00f2ea', posts: 77, eng: 4.2, reach: '58K', saves: '1.7%', growth: '+31.7%', live: true, sparkData: [12,18,15,22,28,25,31,35,29,38,42,40,45,48,52,55,50,58,62,60,65,68,72,70,75,78,82,80,85,88] },
  { name: 'Instagram', color: '#E1306C', posts: 42, eng: 4.8, reach: '36K', saves: '1.9%', growth: '+12.4%', live: true, sparkData: [8,10,12,14,13,16,18,17,20,22,21,24,26,25,28,30,29,32,34,33,36,38,37,40,42,41,44,46,45,48] },
  { name: 'YouTube', color: '#FF0000', posts: 85, eng: 24.7, reach: '210K', saves: '5.2%', growth: '+18.9%', live: true, sparkData: [50,55,52,60,58,65,62,70,68,75,72,80,78,85,82,90,88,95,92,100,98,105,102,110,108,115,112,120,118,125] },
  { name: 'Facebook', color: '#1877F2', posts: 22, eng: 3.1, reach: '12K', saves: '0.8%', growth: '+4.2%', live: false, sparkData: [5,6,5,7,6,8,7,9,8,10,9,11,10,12,11,13,12,14,13,15,14,16,15,17,16,18,17,19,18,20] },
  { name: 'Reddit', color: '#FF4500', posts: 18, eng: 7.7, reach: '9K', saves: '2.1%', growth: '+22.1%', live: false, sparkData: [3,5,4,7,6,9,8,11,10,13,12,15,14,17,16,19,18,21,20,23,22,25,24,27,26,29,28,31,30,33] },
  { name: 'AI Search', color: C.teal, posts: 6, eng: 11.3, reach: '4K', saves: '3.8%', growth: '+44.8%', live: true, sparkData: [1,2,3,4,5,7,9,11,14,17,20,24,28,32,37,42,47,53,59,65,72,79,87,95,104,113,123,133,144,155] },
]

export interface ScheduledItem {
  id: string
  title: string
  platform: string
  platformColor: string
  time: string
  status: 'queued' | 'drafting' | 'writing'
  aiScore: number
}

export const SCHEDULED: ScheduledItem[] = [
  { id: '1', title: 'Why Your Supplements Fail (DNA Proof)', platform: 'TikTok', platformColor: '#00f2ea', time: 'Today 6:30 PM', status: 'queued', aiScore: 94 },
  { id: '2', title: 'Morning Routine: Gene-Guided Stack', platform: 'Instagram', platformColor: '#E1306C', time: 'Tomorrow 8:00 AM', status: 'drafting', aiScore: 87 },
  { id: '3', title: '10-28x Bioavailability Explained', platform: 'YouTube', platformColor: '#FF0000', time: 'Wed 2:00 PM', status: 'writing', aiScore: 91 },
  { id: '4', title: 'MTHFR: What Your Doctor Misses', platform: 'TikTok', platformColor: '#00f2ea', time: 'Thu 6:30 PM', status: 'queued', aiScore: 89 },
]

export interface TopHook {
  hook: string
  score: number
  angle: string
  uses: number
}

export const TOP_HOOKS: TopHook[] = [
  { hook: "I took [X] for 90 days \u2014 here's what my blood panel showed", score: 97, angle: 'Proof/Results', uses: 214 },
  { hook: "Your doctor doesn't test for this but they should", score: 94, angle: 'Authority Gap', uses: 187 },
  { hook: "Why everything you know about [X] is wrong", score: 91, angle: 'Pattern Interrupt', uses: 156 },
  { hook: "The gene variant that makes [X] useless for 30% of people", score: 89, angle: 'Personalization', uses: 132 },
  { hook: "Stop buying [X] until you watch this", score: 87, angle: 'Loss Aversion', uses: 119 },
]

export interface CompetitorDef {
  name: string
  platform: string
  hook: string
  views: string
  eng: string
}

export const COMPETITORS: CompetitorDef[] = [
  { name: 'PrecisionHealth.io', platform: 'TikTok', hook: 'I took this for 30 days and...', views: '4.2M', eng: '8.9%' },
  { name: 'SupplementScience', platform: 'YouTube', hook: "Brands don't want you to know...", views: '1.8M', eng: '6.1%' },
  { name: 'BiohackWithMe', platform: 'Instagram', hook: 'Your doctor never told you...', views: '890K', eng: '7.4%' },
  { name: 'GeneticWellness', platform: 'Reddit', hook: 'After testing 500 people...', views: '340K', eng: '11.2%' },
]

export interface AlertDef {
  id: string
  type: 'hot' | 'warning'
  text: string
  detail: string
  platform: string
}

export const ALERTS: AlertDef[] = [
  { id: 'a1', type: 'hot', text: 'My GoHighLevel automation that saves 10 hrs/week', detail: '2.1M views, 9.4% eng \u2014 Ready to repurpose', platform: 'TikTok' },
  { id: 'a2', type: 'warning', text: "Brand deals are dying \u2014 here's what replaced them", detail: 'Trending hook, 847K searches this week', platform: 'Research' },
]

export const TOP_POSTS = [
  { title: "I tested 29 peptides \u2014 here's what actually worked", views: '2.1M', eng: '9.4%', saves: '48K' },
  { title: "Your DNA is why your supplements aren't working", views: '1.4M', eng: '7.8%', saves: '31K' },
  { title: '10\u201327x bioavailability \u2014 what liposomal actually means', views: '890K', eng: '8.2%', saves: '22K' },
]
