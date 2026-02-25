// POF Trading Journal - Main Application

// Supabase Configuration
const SUPABASE_URL = 'https://sfpvewxmbwfoutccyrpf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmcHZld3htYndmb3V0Y2N5cnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzkwMzYsImV4cCI6MjA4NzU1NTAzNn0.0jGqZvNgvNs7b0sHIbJmq7j9Fisvi0pamOepxcMMakM';

let supabase;
let currentUser = null;
let trades = [];
let playbooks = [];
let currentMonth = new Date();
let charts = {};
let isGuest = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        showApp();
    } else {
        showAuth();
    }
    
    document.getElementById('tradeDate').valueAsDate = new Date();
    document.getElementById('tradeTime').value = new Date().toTimeString().slice(0,5);
    
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            currentUser = session.user;
            isGuest = false;
            showApp();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            isGuest = false;
            showAuth();
        }
    });
});

// Bypass Function for Testing
function enterAsGuest() {
    isGuest = true;
    currentUser = {
        id: 'guest-user',
        email: 'visitante@pof.pro',
        user_metadata: { full_name: 'Trader Visitante' }
    };
    
    // Injetar Playbook de teste
    playbooks = [{ name: 'Sniper V8', description: 'Setup de alta precisão' }];
    
    // Injetar Trades de teste para o Dashboard não ficar vazio
    const today = new Date().toISOString().slice(0,10);
    trades = [
        { id: 1, date: today, time: '10:00', asset: 'MNQ', direction: 'LONG', entry_price: 18000, exit_price: 18100, quantity: 1, pnl: 200, pnl_percent: 0.55, setup: 'Sniper V8', r_multiple: 2, created_at: new Date().toISOString() },
        { id: 2, date: today, time: '14:30', asset: 'MNQ', direction: 'SHORT', entry_price: 18050, exit_price: 18070, quantity: 1, pnl: -40, pnl_percent: -0.11, setup: 'Sniper V8', r_multiple: -1, created_at: new Date().toISOString() },
        { id: 3, date: today, time: '16:00', asset: 'MNQ', direction: 'LONG', entry_price: 18020, exit_price: 18060, quantity: 1, pnl: 80, pnl_percent: 0.22, setup: 'Sniper V8', r_multiple: 1.5, created_at: new Date().toISOString() }
    ];

    showApp();
    Swal.fire({
        title: 'Modo Convidado Ativado',
        text: 'Você está usando dados locais. O salvamento no banco de dados está desativado.',
        icon: 'info',
        timer: 3000,
        toast: true,
        position: 'top-end',
        showConfirmButton: false
    });
}

// Auth Functions
function showAuth() {
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
}

function showApp() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    document.getElementById('userName').textContent = currentUser.user_metadata?.full_name || currentUser.email;
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userAvatar').src = currentUser.user_metadata?.avatar_url || 
        `https://ui-avatars.com/api/?name=${currentUser.email}&background=2D3748&color=C0C0C0`;
    
    if (!isGuest) loadData();
    else updateAll();
}

async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
    if (error) showError(error.message);
}

async function signInWithGithub() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: window.location.origin }
    });
    if (error) showError(error.message);
}

async function signInWithEmail(e) {
    e.preventDefault();
    if (!supabase) return showError('Supabase não inicializado.');
    
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    
    showLoading(true);
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

async function signUp() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    
    if (!email || !password) {
        Swal.fire('Campos vazios', 'Preencha email e senha.', 'info');
        return;
    }
    
    showLoading(true);
    try {
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: { emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
        Swal.fire('Verifique seu Email!', 'Link enviado para ' + email, 'success');
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

async function signOut() {
    if (isGuest) {
        isGuest = false;
        currentUser = null;
        showAuth();
    } else {
        await supabase.auth.signOut();
    }
}

// Data Loading
async function loadData() {
    showLoading(true);
    const [{ data: tradesData }, { data: playbooksData }] = await Promise.all([
        supabase.from('trades').select('*').eq('user_id', currentUser.id).order('date', { ascending: false }).order('time', { ascending: false }),
        supabase.from('playbooks').select('*').eq('user_id', currentUser.id)
    ]);
    trades = tradesData || [];
    playbooks = playbooksData || [];
    updateAll();
    showLoading(false);
}

// UI Functions
function showSection(section) {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active', 'bg-pof-metal/20', 'text-pof-light');
        el.classList.add('text-pof-darksilver');
    });
    const activeNav = document.querySelector(`[data-section="${section}"]`);
    if (activeNav) {
        activeNav.classList.add('active', 'bg-pof-metal/20', 'text-pof-light');
        activeNav.classList.remove('text-pof-darksilver');
    }
    
    document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
    document.getElementById(section).classList.remove('hidden');
    
    const titles = {
        dashboard: ['Dashboard', 'Visão geral do desempenho'],
        journal: ['Diário de Trades', 'Registro completo de operações'],
        analytics: ['Análises Avançadas', 'Métricas detalhadas'],
        calendar: ['Calendário', 'Visualização mensal do P&L'],
        playbooks: ['Playbooks', 'Estratégias catalogadas']
    };
    
    document.getElementById('pageTitle').textContent = titles[section][0];
    document.getElementById('pageSubtitle').textContent = titles[section][1];
    
    if (section === 'calendar') renderCalendar();
    if (section === 'playbooks') renderPlaybooks();
}

function openTradeModal() {
    document.getElementById('tradeModal').classList.remove('hidden');
    document.getElementById('tradeModal').classList.add('flex');
    updateSetupOptions();
}

function closeTradeModal() {
    document.getElementById('tradeModal').classList.add('hidden');
    document.getElementById('tradeModal').classList.remove('flex');
    document.getElementById('tradeForm').reset();
    document.getElementById('tradeDate').valueAsDate = new Date();
    document.getElementById('tradeTime').value = new Date().toTimeString().slice(0,5);
}

async function saveTrade(e) {
    e.preventDefault();
    
    const trade = {
        user_id: currentUser.id,
        date: document.getElementById('tradeDate').value,
        time: document.getElementById('tradeTime').value,
        asset: document.getElementById('tradeAsset').value.toUpperCase(),
        direction: document.getElementById('tradeDirection').value,
        entry_price: parseFloat(document.getElementById('tradeEntry').value),
        exit_price: parseFloat(document.getElementById('tradeExit').value),
        quantity: parseInt(document.getElementById('tradeQuantity').value),
        stop_loss: parseFloat(document.getElementById('tradeStop').value) || null,
        take_profit: parseFloat(document.getElementById('tradeTarget').value) || null,
        setup: document.getElementById('tradeSetup').value || null,
        tags: document.getElementById('tradeTags').value.split(',').map(t => t.trim()).filter(t => t),
        notes: document.getElementById('tradeNotes').value,
        created_at: new Date().toISOString()
    };
    
    const multiplier = trade.direction === 'LONG' ? 1 : -1;
    trade.pnl = (trade.exit_price - trade.entry_price) * trade.quantity * multiplier;
    trade.pnl_percent = ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100 * multiplier;
    
    if (trade.stop_loss) {
        const risk = Math.abs(trade.entry_price - trade.stop_loss) * trade.quantity;
        trade.r_multiple = risk > 0 ? trade.pnl / risk : 0;
    } else {
        trade.r_multiple = 0;
    }
    
    if (isGuest) {
        trade.id = Date.now();
        trades.unshift(trade);
        closeTradeModal();
        updateAll();
        return;
    }
    
    showLoading(true);
    const { data, error } = await supabase.from('trades').insert([trade]).select();
    showLoading(false);
    
    if (error) showError('Erro ao salvar: ' + error.message);
    else {
        trades.unshift(data[0]);
        closeTradeModal();
        updateAll();
        Swal.fire({ title: 'Trade Salvo!', text: `P&L: ${formatCurrency(trade.pnl)}`, icon: 'success', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
    }
}

async function deleteTrade(id) {
    const result = await Swal.fire({ title: 'Excluir trade?', text: "Esta ação não pode ser desfeita!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Sim, excluir!' });
    if (result.isConfirmed) {
        if (isGuest) {
            trades = trades.filter(t => t.id !== id);
            updateAll();
            return;
        }
        showLoading(true);
        const { error } = await supabase.from('trades').delete().eq('id', id);
        showLoading(false);
        if (error) showError(error.message);
        else { trades = trades.filter(t => t.id !== id); updateAll(); }
    }
}

// Calculations & Charts (Omitted for brevity, assumed same as previous working version)
function calculateStats() {
    if (trades.length === 0) return { netPnl: 0, winRate: 0, profitFactor: 0, expectancy: 0, avgWinner: 0, avgLoser: 0, totalTrades: 0, grossProfit: 0, grossLoss: 0, wins: 0, losses: 0, largestWin: 0, largestLoss: 0 };
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    return {
        netPnl: trades.reduce((sum, t) => sum + t.pnl, 0),
        winRate: (wins.length / trades.length) * 100,
        profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0,
        expectancy: trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / trades.length,
        avgWinner: wins.length > 0 ? grossProfit / wins.length : 0,
        avgLoser: losses.length > 0 ? grossLoss / losses.length : 0,
        totalTrades: trades.length,
        grossProfit, grossLoss, wins: wins.length, losses: losses.length,
        largestWin: wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0,
        largestLoss: losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0
    };
}

function calculatePofScore() {
    if (trades.length < 3) return { total: 0, profit: 0, consistency: 0, risk: 0 };
    const stats = calculateStats();
    const profitScore = Math.min(40, (stats.netPnl > 0 ? 20 : 0) + (stats.profitFactor > 1.5 ? 20 : stats.profitFactor > 1 ? 10 : 0));
    const recentTrades = trades.slice(0, 10);
    const recentWins = recentTrades.filter(t => t.pnl > 0).length;
    const consistencyScore = Math.min(30, (recentWins / (recentTrades.length || 1)) * 30);
    const avgR = trades.reduce((sum, t) => sum + Math.abs(t.r_multiple || 0), 0) / (trades.length || 1);
    const riskScore = Math.min(30, avgR > 1.5 ? 30 : avgR > 0.8 ? 20 : 10);
    return { total: Math.round(profitScore + consistencyScore + riskScore), profit: Math.round(profitScore), consistency: Math.round(consistencyScore), risk: Math.round(riskScore) };
}

function updateAll() { updateDashboard(); updateJournal(); updateAnalytics(); }

function updateDashboard() {
    const stats = calculateStats();
    const pof = calculatePofScore();
    document.getElementById('pofScore').textContent = pof.total;
    document.getElementById('scoreCircle').style.setProperty('--score', pof.total);
    document.getElementById('profitScore').textContent = pof.profit;
    document.getElementById('consistencyScore').textContent = pof.consistency;
    document.getElementById('riskScore').textContent = pof.risk;
    document.getElementById('statNetPnl').textContent = formatCurrency(stats.netPnl);
    document.getElementById('statNetPnl').className = 'text-xl font-bold ' + (stats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400');
    document.getElementById('statWinRate').textContent = stats.winRate.toFixed(1) + '%';
    document.getElementById('statTotalTrades').textContent = stats.totalTrades + ' trades';
    document.getElementById('statProfitFactor').textContent = stats.profitFactor.toFixed(2);
    document.getElementById('statExpectancy').textContent = stats.expectancy.toFixed(2) + 'R';
    document.getElementById('statAvgWinner').textContent = formatCurrency(stats.avgWinner);
    document.getElementById('statAvgLoser').textContent = formatCurrency(stats.avgLoser);
    document.getElementById('statLargestWin').textContent = 'Maior: ' + formatCurrency(stats.largestWin);
    document.getElementById('statLargestLoss').textContent = 'Maior: ' + formatCurrency(stats.largestLoss);
    updateCharts();
    updateRecentTrades();
}

function updateCharts() {
    const equityData = calculateEquityCurve();
    const ctx1 = document.getElementById('equityChart').getContext('2d');
    if (charts.equity) charts.equity.destroy();
    charts.equity = new Chart(ctx1, { type: 'line', data: { labels: equityData.labels, datasets: [{ label: 'Equity', data: equityData.data, borderColor: '#C0C0C0', backgroundColor: 'rgba(192, 192, 192, 0.1)', fill: true, tension: 0.4, pointRadius: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(192, 192, 192, 0.05)' }, ticks: { color: '#8A8A8A' } }, x: { grid: { display: false }, ticks: { color: '#8A8A8A', maxTicksLimit: 6 } } } } });

    const dailyData = calculateDailyPnl();
    const ctx2 = document.getElementById('dailyPnlChart').getContext('2d');
    if (charts.daily) charts.daily.destroy();
    charts.daily = new Chart(ctx2, { type: 'bar', data: { labels: dailyData.labels, datasets: [{ label: 'P&L', data: dailyData.data, backgroundColor: dailyData.data.map(v => v >= 0 ? '#10b981' : '#ef4444'), borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(192, 192, 192, 0.05)' }, ticks: { color: '#8A8A8A' } }, x: { grid: { display: false }, ticks: { color: '#8A8A8A', maxTicksLimit: 8 } } } } });

    const setupData = calculateSetupStats();
    const ctx3 = document.getElementById('setupChart').getContext('2d');
    if (charts.setup) charts.setup.destroy();
    charts.setup = new Chart(ctx3, { type: 'doughnut', data: { labels: setupData.labels, datasets: [{ data: setupData.data, backgroundColor: ['#C0C0C0', '#8A8A8A', '#4A5568', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#8A8A8A', boxWidth: 12, font: { size: 10 } } } } } });

    const hourlyData = calculateHourlyStats();
    const ctx4 = document.getElementById('hourlyChart').getContext('2d');
    if (charts.hourly) charts.hourly.destroy();
    charts.hourly = new Chart(ctx4, { type: 'bar', data: { labels: hourlyData.labels, datasets: [{ label: 'P&L Médio', data: hourlyData.data, backgroundColor: '#C0C0C0', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(192, 192, 192, 0.05)' }, ticks: { color: '#8A8A8A' } }, x: { grid: { display: false }, ticks: { color: '#8A8A8A' } } } } });
}

function calculateEquityCurve() { let currentEquity = 0; const labels = ['Início']; const data = [0]; trades.slice().reverse().forEach(trade => { currentEquity += trade.pnl; labels.push(new Date(trade.date).toLocaleDateString()); data.push(currentEquity); }); return { labels, data }; }
function calculateDailyPnl() { const daily = {}; trades.forEach(trade => { const date = trade.date; daily[date] = (daily[date] || 0) + trade.pnl; }); const sortedDates = Object.keys(daily).sort(); const last30Days = sortedDates.slice(-30); return { labels: last30Days.map(d => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })), data: last30Days.map(d => daily[d]) }; }
function calculateSetupStats() { const setupPnl = {}; trades.forEach(t => { const setup = t.setup || 'Sem Setup'; setupPnl[setup] = (setupPnl[setup] || 0) + t.pnl; }); return { labels: Object.keys(setupPnl), data: Object.values(setupPnl) }; }
function calculateHourlyStats() { const hourly = {}; const counts = {}; trades.forEach(t => { const hour = t.time.split(':')[0]; hourly[hour] = (hourly[hour] || 0) + t.pnl; counts[hour] = (counts[hour] || 0) + 1; }); const hours = Object.keys(hourly).sort((a, b) => parseInt(a) - parseInt(b)); return { labels: hours.map(h => h + ':00'), data: hours.map(h => hourly[h] / (counts[h] || 1)) }; }

function updateRecentTrades() {
    const tbody = document.getElementById('recentTradesBody');
    if (!tbody) return;
    tbody.innerHTML = trades.slice(0, 5).map(trade => `<tr><td class="px-6 py-4">${new Date(trade.date).toLocaleDateString()}</td><td class="px-6 py-4 font-semibold text-pof-light">${trade.asset}</td><td class="px-6 py-4"><span class="px-2 py-1 rounded text-xs font-semibold ${trade.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">${trade.direction}</span></td><td class="px-6 py-4 text-pof-darksilver">${trade.setup || '-'}</td><td class="px-6 py-4">R$ ${trade.entry_price.toFixed(2)}</td><td class="px-6 py-4">R$ ${trade.exit_price.toFixed(2)}</td><td class="px-6 py-4 font-semibold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${formatCurrency(trade.pnl)}</td><td class="px-6 py-4 text-pof-darksilver">${trade.r_multiple ? trade.r_multiple.toFixed(2) + 'R' : '-'}</td></tr>`).join('');
}

function updateJournal() {
    const tbody = document.getElementById('allTradesBody');
    if (!tbody) return;
    const setups = [...new Set(trades.map(t => t.setup).filter(s => s))];
    const filterSetup = document.getElementById('filterSetup');
    if (filterSetup) filterSetup.innerHTML = '<option value="">Todos Setups</option>' + setups.map(s => `<option value="${s}">${s}</option>`).join('');
    tbody.innerHTML = trades.map(trade => `<tr class="hover:bg-pof-metal/10 transition"><td class="px-6 py-4 whitespace-nowrap">${new Date(trade.date).toLocaleDateString()} ${trade.time}</td><td class="px-6 py-4 font-semibold text-pof-light">${trade.asset}</td><td class="px-6 py-4"><span class="px-2 py-1 rounded text-xs font-semibold ${trade.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">${trade.direction}</span></td><td class="px-6 py-4 text-pof-darksilver">${trade.setup || '-'}</td><td class="px-6 py-4">R$ ${trade.entry_price.toFixed(2)}</td><td class="px-6 py-4">R$ ${trade.exit_price.toFixed(2)}</td><td class="px-6 py-4">${trade.quantity}</td><td class="px-6 py-4 font-semibold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${formatCurrency(trade.pnl)}</td><td class="px-6 py-4 text-pof-darksilver">${trade.r_multiple ? trade.r_multiple.toFixed(2) + 'R' : '-'}</td><td class="px-6 py-4"><button onclick="deleteTrade('${trade.id}')" class="text-rose-400 hover:text-rose-300 transition"><i class="fas fa-trash"></i></button></td></tr>`).join('');
    document.getElementById('emptyState').classList.toggle('hidden', trades.length > 0);
}

function updateAnalytics() {
    if (trades.length === 0) return;
    const stats = calculateStats();
    document.getElementById('metricAvgRisk').textContent = formatCurrency(stats.avgLoser);
    document.getElementById('metricAvgReward').textContent = formatCurrency(stats.avgWinner);
    document.getElementById('metricAvgRR').textContent = stats.avgLoser > 0 ? '1:' + (stats.avgWinner / stats.avgLoser).toFixed(1) : '1:0';
    
    const weekdayData = calculateWeekdayStats();
    const ctx1 = document.getElementById('weekdayChart').getContext('2d');
    if (charts.weekday) charts.weekday.destroy();
    charts.weekday = new Chart(ctx1, { type: 'bar', data: { labels: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], datasets: [{ label: 'P&L Total', data: Object.values(weekdayData), backgroundColor: Object.values(weekdayData).map(v => v >= 0 ? '#10b981' : '#ef4444'), borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(192, 192, 192, 0.05)' }, ticks: { color: '#8A8A8A' } }, x: { grid: { display: false }, ticks: { color: '#8A8A8A' } } } } });
    
    const rMultiples = trades.map(t => t.r_multiple || 0).filter(r => r !== 0);
    const ctx2 = document.getElementById('rMultipleChart').getContext('2d');
    if (charts.rmulti) charts.rmulti.destroy();
    charts.rmulti = new Chart(ctx2, { type: 'bar', data: { labels: ['<-1R', '-1R a 0', '0 a 1R', '1R a 2R', '2R a 3R', '>3R'], datasets: [{ label: 'Trades', data: [rMultiples.filter(r => r < -1).length, rMultiples.filter(r => r >= -1 && r < 0).length, rMultiples.filter(r => r >= 0 && r < 1).length, rMultiples.filter(r => r >= 1 && r < 2).length, rMultiples.filter(r => r >= 2 && r < 3).length, rMultiples.filter(r => r >= 3).length], backgroundColor: '#C0C0C0', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(192, 192, 192, 0.05)' }, ticks: { color: '#8A8A8A' } }, x: { grid: { display: false }, ticks: { color: '#8A8A8A' } } } } });
    
    const tagCounts = {};
    trades.forEach(t => { (t.tags || []).forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; }); });
    document.getElementById('tagsAnalysis').innerHTML = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => `<span class="px-3 py-1 bg-pof-metal/30 rounded-full text-xs border border-pof-silver/20">${tag} <span class="text-pof-silver font-bold ml-1">${count}</span></span>`).join('') || '<p class="text-pof-darksilver text-sm">Adicione tags para análise</p>';
}

function calculateWeekdayStats() { const days = { 'Dom': 0, 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0, 'Sáb': 0 }; const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']; trades.forEach(t => { const day = dayNames[new Date(t.date + 'T00:00:00').getDay()]; days[day] += t.pnl; }); return days; }

function renderCalendar() {
    const year = currentMonth.getFullYear(); const month = currentMonth.getMonth(); const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
    document.getElementById('calendarMonth').textContent = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const dailyPnl = {}; trades.forEach(t => { const date = new Date(t.date + 'T00:00:00'); if (date.getMonth() === month && date.getFullYear() === year) { const day = date.getDate(); dailyPnl[day] = (dailyPnl[day] || 0) + t.pnl; } });
    let html = ''; for (let i = 0; i < firstDay; i++) { html += '<div></div>'; }
    for (let day = 1; day <= daysInMonth; day++) {
        const pnl = dailyPnl[day] || 0; const className = pnl > 0 ? 'bg-emerald-500/20 border-emerald-500/50' : pnl < 0 ? 'bg-rose-500/20 border-rose-500/50' : 'bg-pof-metal/20 border-pof-metal/30';
        html += `<div class="aspect-square rounded-lg border ${className} p-1 flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition"><span class="text-[10px] text-pof-darksilver mb-auto w-full text-left">${day}</span>${pnl !== 0 ? `<span class="text-[9px] font-bold ${pnl > 0 ? 'text-emerald-400' : 'text-rose-400'}">${pnl > 0 ? '+' : ''}${Math.round(pnl)}</span>` : ''}</div>`;
    }
    document.getElementById('calendarGrid').innerHTML = html;
    const values = Object.values(dailyPnl);
    if (values.length > 0) {
        document.getElementById('calBestDay').textContent = formatCurrency(Math.max(...values, 0)); document.getElementById('calWorstDay').textContent = formatCurrency(Math.min(...values, 0)); document.getElementById('calAvgDay').textContent = formatCurrency(values.reduce((a, b) => a + b, 0) / values.length); document.getElementById('calPositiveDays').textContent = values.filter(v => v > 0).length;
    }
}

function changeMonth(delta) { currentMonth.setMonth(currentMonth.getMonth() + delta); renderCalendar(); }

function renderPlaybooks() {
    const grid = document.getElementById('playbooksGrid');
    const processedPlaybooks = playbooks.map(pb => { const pbTrades = trades.filter(t => t.setup === pb.name); return { ...pb, total: pbTrades.length, winRate: pbTrades.length > 0 ? (pbTrades.filter(t => t.pnl > 0).length / pbTrades.length * 100) : 0, pnl: pbTrades.reduce((sum, t) => sum + t.pnl, 0) }; });
    grid.innerHTML = processedPlaybooks.map(pb => `<div class="metal-card rounded-xl p-6 cursor-pointer group"><div class="flex justify-between items-start mb-4"><div class="min-w-0"><h3 class="font-display font-bold text-lg text-pof-light mb-1 tracking-wide truncate">${pb.name}</h3><p class="text-sm text-pof-darksilver line-clamp-2">${pb.description || 'Sem descrição'}</p></div><span class="px-3 py-1 rounded-full text-sm font-bold flex-shrink-0 ${pb.pnl >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">${pb.pnl >= 0 ? '+' : ''}${formatCurrency(pb.pnl)}</span></div><div class="grid grid-cols-3 gap-4 pt-4 border-t border-pof-metal/30"><div class="text-center"><div class="text-xl font-bold text-pof-silver">${pb.total}</div><div class="text-xs text-pof-darksilver uppercase tracking-wider">Trades</div></div><div class="text-center"><div class="text-xl font-bold ${pb.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}">${pb.winRate.toFixed(1)}%</div><div class="text-xs text-pof-darksilver uppercase tracking-wider">Win Rate</div></div><div class="text-center"><div class="text-xl font-bold ${pb.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${formatCurrency(pb.pnl)}</div><div class="text-xs text-pof-darksilver uppercase tracking-wider">P&L</div></div></div></div>`).join('');
    updateSetupOptions();
}

async function openPlaybookModal() {
    const { value: formValues } = await Swal.fire({ title: 'Novo Playbook', html: '<input id="swal-name" class="swal2-input" placeholder="Nome do Setup"><input id="swal-desc" class="swal2-input" placeholder="Descrição">', focusConfirm: false, showCancelButton: true, confirmButtonColor: '#C0C0C0', confirmButtonText: 'Criar Playbook', preConfirm: () => [document.getElementById('swal-name').value, document.getElementById('swal-desc').value] });
    if (formValues && formValues[0]) {
        const [name, description] = formValues;
        if (isGuest) { playbooks.push({ name, description }); renderPlaybooks(); return; }
        const { data, error } = await supabase.from('playbooks').insert([{ user_id: currentUser.id, name, description }]).select();
        if (error) showError(error.message); else { playbooks.push(data[0]); renderPlaybooks(); }
    }
}

function updateSetupOptions() {
    const select = document.getElementById('tradeSetup');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Selecione...</option>' + playbooks.map(pb => `<option value="${pb.name}">${pb.name}</option>`).join('');
    select.value = current;
}

function formatCurrency(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
function showLoading(show) { const overlay = document.getElementById('loadingOverlay'); if (overlay) { overlay.classList.toggle('hidden', !show); overlay.classList.toggle('flex', show); } }
function showError(message) { Swal.fire('Erro!', message, 'error'); }

function exportToCSV() {
    if (trades.length === 0) { Swal.fire('Sem dados', 'Não há trades para exportar.', 'info'); return; }
    const headers = ['Data', 'Hora', 'Ativo', 'Direção', 'Entrada', 'Saída', 'Qtd', 'P&L', 'P&L %', 'Setup', 'Notas'];
    const csvRows = [headers.join(',')];
    trades.forEach(t => { const row = [t.date, t.time, t.asset, t.direction, t.entry_price, t.exit_price, t.quantity, t.pnl.toFixed(2), t.pnl_percent.toFixed(2), t.setup || '', `"${(t.notes || '').replace(/"/g, '""')}"` ]; csvRows.push(row.join(',')); });
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `trades_pof_${new Date().toISOString().slice(0,10)}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function filterTrades() {
    const asset = document.getElementById('searchAsset').value.toLowerCase();
    const setup = document.getElementById('filterSetup').value;
    const direction = document.getElementById('filterDirection').value;
    const result = document.getElementById('filterResult').value;
    const rows = document.querySelectorAll('#allTradesBody tr');
    rows.forEach(row => {
        const cells = row.cells; if (!cells.length) return;
        const rowAsset = cells[1].textContent.toLowerCase(); const rowSetup = cells[3].textContent; const rowDirection = cells[2].textContent.trim(); const rowPnl = cells[7].textContent; const isWin = rowPnl.includes('R$') && !rowPnl.includes('-');
        let show = true; if (asset && !rowAsset.includes(asset)) show = false; if (setup && rowSetup !== setup) show = false; if (direction && !rowDirection.includes(direction)) show = false; if (result === 'win' && !isWin) show = false; if (result === 'loss' && isWin) show = false;
        row.style.display = show ? '' : 'none';
    });
}
