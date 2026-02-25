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
    console.log("POF Journal Initializing...");
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            currentUser = session.user;
            showApp();
        } else {
            showAuth();
        }
        
        if (document.getElementById('tradeDate')) {
            document.getElementById('tradeDate').valueAsDate = new Date();
            document.getElementById('tradeTime').value = new Date().toTimeString().slice(0,5);
        }
        
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
    } catch (e) {
        console.error("Initialization error:", e);
    }
});

// --- GLOBAL FUNCTIONS (Called from HTML) ---

window.enterAsGuest = function() {
    console.log("Entering as Guest...");
    isGuest = true;
    currentUser = {
        id: 'guest-user',
        email: 'visitante@pof.pro',
        user_metadata: { full_name: 'Trader Visitante' }
    };
    
    playbooks = [{ name: 'Sniper V8', description: 'Setup de alta precisão' }];
    
    const today = new Date().toISOString().slice(0,10);
    trades = [
        { id: 1, date: today, time: '10:00', asset: 'MNQ', direction: 'LONG', entry_price: 18000, exit_price: 18100, quantity: 1, pnl: 200, pnl_percent: 0.55, setup: 'Sniper V8', r_multiple: 2, created_at: new Date().toISOString() },
        { id: 2, date: today, time: '14:30', asset: 'MNQ', direction: 'SHORT', entry_price: 18050, exit_price: 18070, quantity: 1, pnl: -40, pnl_percent: -0.11, setup: 'Sniper V8', r_multiple: -1, created_at: new Date().toISOString() },
        { id: 3, date: today, time: '16:00', asset: 'MNQ', direction: 'LONG', entry_price: 18020, exit_price: 18060, quantity: 1, pnl: 80, pnl_percent: 0.22, setup: 'Sniper V8', r_multiple: 1.5, created_at: new Date().toISOString() }
    ];

    showApp();
    Swal.fire({
        title: 'Modo Convidado Ativado',
        text: 'Você está usando dados locais para teste.',
        icon: 'info',
        timer: 2000,
        toast: true,
        position: 'top-end',
        showConfirmButton: false
    });
};

window.signInWithEmail = async function(e) {
    e.preventDefault();
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
};

window.signUp = async function() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    if (!email || !password) return Swal.fire('Erro', 'Preencha email e senha.', 'error');
    showLoading(true);
    try {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Swal.fire('Sucesso', 'Verifique seu e-mail para confirmar o cadastro.', 'success');
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
};

window.signOut = async function() {
    if (isGuest) { isGuest = false; currentUser = null; showAuth(); }
    else await supabase.auth.signOut();
};

window.showSection = function(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(section);
    if (target) target.classList.remove('hidden');
    
    const titles = {
        dashboard: ['Dashboard', 'Visão geral do desempenho'],
        journal: ['Diário de Trades', 'Registro completo de operações'],
        analytics: ['Análises Avançadas', 'Métricas detalhadas'],
        calendar: ['Calendário', 'Visualização mensal do P&L'],
        playbooks: ['Playbooks', 'Estratégias catalogadas']
    };
    
    if (titles[section]) {
        document.getElementById('pageTitle').textContent = titles[section][0];
        document.getElementById('pageSubtitle').textContent = titles[section][1];
    }
    
    if (section === 'calendar') renderCalendar();
    if (section === 'playbooks') renderPlaybooks();
};

window.openTradeModal = function() {
    document.getElementById('tradeModal').classList.remove('hidden');
    document.getElementById('tradeModal').classList.add('flex');
    updateSetupOptions();
};

window.closeTradeModal = function() {
    document.getElementById('tradeModal').classList.add('hidden');
    document.getElementById('tradeModal').classList.remove('flex');
};

window.saveTrade = async function(e) {
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
        setup: document.getElementById('tradeSetup').value || null,
        notes: document.getElementById('tradeNotes').value,
        created_at: new Date().toISOString()
    };
    
    const multiplier = trade.direction === 'LONG' ? 1 : -1;
    trade.pnl = (trade.exit_price - trade.entry_price) * trade.quantity * multiplier;
    trade.r_multiple = 1;

    if (isGuest) {
        trade.id = Date.now();
        trades.unshift(trade);
        closeTradeModal();
        updateAll();
    } else {
        showLoading(true);
        const { data, error } = await supabase.from('trades').insert([trade]).select();
        showLoading(false);
        if (!error) { trades.unshift(data[0]); closeTradeModal(); updateAll(); }
        else showError(error.message);
    }
};

window.deleteTrade = function(id) {
    if (isGuest) { trades = trades.filter(t => t.id !== id); updateAll(); }
    else {
        supabase.from('trades').delete().eq('id', id).then(() => { trades = trades.filter(t => t.id !== id); updateAll(); });
    }
};

window.openPlaybookModal = async function() {
    const { value: name } = await Swal.fire({ title: 'Novo Playbook', input: 'text', inputPlaceholder: 'Nome do Setup', showCancelButton: true });
    if (name) {
        if (isGuest) { playbooks.push({ name, description: '' }); renderPlaybooks(); }
        else {
            const { data, error } = await supabase.from('playbooks').insert([{ user_id: currentUser.id, name, description: '' }]).select();
            if (!error) { playbooks.push(data[0]); renderPlaybooks(); }
        }
    }
};

window.changeMonth = function(delta) { currentMonth.setMonth(currentMonth.getMonth() + delta); renderCalendar(); };
window.exportToCSV = function() { /* Implementação básica */ console.log("Exporting CSV..."); };
window.filterTrades = function() { /* Implementação básica */ };

// --- INTERNAL APP LOGIC ---

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

async function loadData() {
    showLoading(true);
    try {
        const [{ data: tradesData }, { data: playbooksData }] = await Promise.all([
            supabase.from('trades').select('*').eq('user_id', currentUser.id).order('date', { ascending: false }),
            supabase.from('playbooks').select('*').eq('user_id', currentUser.id)
        ]);
        trades = tradesData || [];
        playbooks = playbooksData || [];
        updateAll();
    } catch (e) {
        console.error(e);
    } finally {
        showLoading(false);
    }
}

function updateAll() {
    updateDashboard();
    updateJournal();
    updateAnalytics();
}

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
    
    updateCharts();
    updateRecentTrades();
}

function calculateStats() {
    if (trades.length === 0) return { netPnl: 0, winRate: 0, profitFactor: 0, expectancy: 0, avgWinner: 0, avgLoser: 0, totalTrades: 0, grossProfit: 0, grossLoss: 0, wins: 0, losses: 0, largestWin: 0, largestLoss: 0 };
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    return {
        netPnl: trades.reduce((sum, t) => sum + t.pnl, 0),
        winRate: (wins.length / trades.length) * 100,
        profitFactor: grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 9.9 : 0),
        expectancy: (trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / trades.length),
        avgWinner: wins.length > 0 ? grossProfit / wins.length : 0,
        avgLoser: losses.length > 0 ? grossLoss / losses.length : 0,
        totalTrades: trades.length
    };
}

function calculatePofScore() {
    if (trades.length < 3) return { total: 0, profit: 0, consistency: 0, risk: 0 };
    const stats = calculateStats();
    const profitScore = Math.min(40, (stats.netPnl > 0 ? 20 : 0) + (stats.profitFactor > 1.2 ? 20 : 0));
    const recentWins = trades.slice(0, 10).filter(t => t.pnl > 0).length;
    const consistencyScore = Math.min(30, (recentWins / Math.min(trades.length, 10)) * 30);
    const riskScore = Math.min(30, (stats.expectancy > 0.5 ? 30 : 15));
    return { total: Math.round(profitScore + consistencyScore + riskScore), profit: Math.round(profitScore), consistency: Math.round(consistencyScore), risk: Math.round(riskScore) };
}

function updateCharts() {
    const equityData = calculateEquityCurve();
    const ctx1 = document.getElementById('equityChart');
    if (ctx1) {
        if (charts.equity) charts.equity.destroy();
        charts.equity = new Chart(ctx1.getContext('2d'), {
            type: 'line',
            data: { labels: equityData.labels, datasets: [{ label: 'Equity', data: equityData.data, borderColor: '#C0C0C0', backgroundColor: 'rgba(192, 192, 192, 0.1)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    const dailyData = calculateDailyPnl();
    const ctx2 = document.getElementById('dailyPnlChart');
    if (ctx2) {
        if (charts.daily) charts.daily.destroy();
        charts.daily = new Chart(ctx2.getContext('2d'), {
            type: 'bar',
            data: { labels: dailyData.labels, datasets: [{ label: 'P&L', data: dailyData.data, backgroundColor: dailyData.data.map(v => v >= 0 ? '#10b981' : '#ef4444') }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }
}

function calculateEquityCurve() {
    let current = 0;
    const labels = ['Start'];
    const data = [0];
    [...trades].reverse().forEach(t => {
        current += t.pnl;
        labels.push(new Date(t.date).toLocaleDateString());
        data.push(current);
    });
    return { labels, data };
}

function calculateDailyPnl() {
    const daily = {};
    trades.forEach(t => { daily[t.date] = (daily[t.date] || 0) + t.pnl; });
    const sorted = Object.keys(daily).sort();
    return { labels: sorted, data: sorted.map(d => daily[d]) };
}

function updateRecentTrades() {
    const tbody = document.getElementById('recentTradesBody');
    if (!tbody) return;
    tbody.innerHTML = trades.slice(0, 5).map(t => `
        <tr class="border-b border-pof-metal/10">
            <td class="px-6 py-4">${t.date}</td>
            <td class="px-6 py-4 font-bold text-pof-light">${t.asset}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 rounded text-xs ${t.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">${t.direction}</span></td>
            <td class="px-6 py-4 text-pof-darksilver">${t.setup || '-'}</td>
            <td class="px-6 py-4">${t.entry_price}</td>
            <td class="px-6 py-4">${t.exit_price}</td>
            <td class="px-6 py-4 font-bold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${formatCurrency(t.pnl)}</td>
            <td class="px-6 py-4 text-pof-darksilver">${t.r_multiple ? t.r_multiple.toFixed(1) + 'R' : '-'}</td>
        </tr>
    `).join('');
}

function updateJournal() {
    const tbody = document.getElementById('allTradesBody');
    if (!tbody) return;
    tbody.innerHTML = trades.map(t => `
        <tr class="border-b border-pof-metal/10">
            <td class="px-6 py-4">${t.date} ${t.time}</td>
            <td class="px-6 py-4 font-bold text-pof-light">${t.asset}</td>
            <td class="px-6 py-4">${t.direction}</td>
            <td class="px-6 py-4 text-pof-darksilver">${t.setup || '-'}</td>
            <td class="px-6 py-4">${t.entry_price}</td>
            <td class="px-6 py-4">${t.exit_price}</td>
            <td class="px-6 py-4">${t.quantity}</td>
            <td class="px-6 py-4 font-bold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${formatCurrency(t.pnl)}</td>
            <td class="px-6 py-4">${t.r_multiple ? t.r_multiple.toFixed(1) + 'R' : '-'}</td>
            <td class="px-6 py-4"><button onclick="deleteTrade('${t.id}')" class="text-rose-400 hover:text-rose-300"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('');
    document.getElementById('emptyState').classList.toggle('hidden', trades.length > 0);
}

function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    document.getElementById('calendarMonth').textContent = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const dailyPnl = {};
    trades.forEach(t => {
        const d = new Date(t.date + 'T12:00:00');
        if (d.getMonth() === month && d.getFullYear() === year) { dailyPnl[d.getDate()] = (dailyPnl[d.getDate()] || 0) + t.pnl; }
    });
    let html = '';
    for (let i = 0; i < firstDay; i++) html += '<div></div>';
    for (let day = 1; day <= daysInMonth; day++) {
        const pnl = dailyPnl[day] || 0;
        const colorClass = pnl > 0 ? 'bg-emerald-500/20 text-emerald-400' : (pnl < 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-pof-metal/10 text-pof-darksilver');
        html += `<div class="aspect-square rounded border border-pof-metal/20 flex flex-col items-center justify-center ${colorClass}"><span class="text-[10px] opacity-50">${day}</span><span class="text-[9px] font-bold">${pnl !== 0 ? Math.round(pnl) : ''}</span></div>`;
    }
    document.getElementById('calendarGrid').innerHTML = html;
}

function renderPlaybooks() {
    const grid = document.getElementById('playbooksGrid');
    grid.innerHTML = playbooks.map(pb => {
        const pbTrades = trades.filter(t => t.setup === pb.name);
        const pnl = pbTrades.reduce((s, t) => s + t.pnl, 0);
        return `<div class="metal-card rounded-xl p-6"><div class="flex justify-between items-start mb-4"><h3 class="font-display font-bold text-pof-light">${pb.name}</h3><span class="px-2 py-1 rounded text-xs font-bold ${pnl >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">${formatCurrency(pnl)}</span></div><p class="text-sm text-pof-darksilver mb-4">${pb.description || ''}</p><div class="grid grid-cols-2 gap-4 text-center"><div><div class="text-lg font-bold">${pbTrades.length}</div><div class="text-[10px] uppercase text-pof-darksilver">Trades</div></div><div><div class="text-lg font-bold">${pbTrades.length > 0 ? Math.round((pbTrades.filter(t => t.pnl > 0).length / pbTrades.length) * 100) : 0}%</div><div class="text-[10px] uppercase text-pof-darksilver">Win Rate</div></div></div></div>`;
    }).join('');
    updateSetupOptions();
}

function updateSetupOptions() {
    const select = document.getElementById('tradeSetup');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione...</option>' + playbooks.map(pb => `<option value="${pb.name}">${pb.name}</option>`).join('');
}

function formatCurrency(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function showLoading(s) { document.getElementById('loadingOverlay')?.classList.toggle('hidden', !s); }
function showError(m) { Swal.fire('Erro', m, 'error'); }
