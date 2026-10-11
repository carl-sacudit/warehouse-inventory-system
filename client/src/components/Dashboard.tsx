import { useCallback, useEffect, useMemo, useState } from "react";
import {
	AlertTriangle,
	ArrowDownToLine,
	ArrowRight,
	ArrowUpFromLine,
	Boxes,
	ClipboardList,
	Clock3,
	CircleDollarSign,
	Package,
	RefreshCw,
	TrendingUp,
	Wallet,
} from "lucide-react";
import type { Product } from "../services/productService";
import {
	getPurchaseOrders,
	type PurchaseOrder,
} from "../services/purchaseOrderService";
import {
	getStockMovements,
	type StockMovement,
} from "../services/stockMovementService";
import {
	getSalesOrders,
	type SalesOrder,
} from "../services/salesOrderService";
import ProductThumbnail from "./ProductThumbnail.tsx";
import { useToast } from "./ToastProvider.tsx";
import "./Dashboard.css";

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

interface DashboardProps {
	products: Product[];
	productsLoading: boolean;
	canManageProducts: boolean;
	onAddProduct: () => void;
	onRefreshProducts: () => Promise<void>;
	onNavigate: (page: string) => void;
}

interface TrendBucket {
	label: string;
	inbound: number;
	outbound: number;
}

function dateKeyToDate(value: string): Date | null {
	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!match) return null;

	return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function movementDate(value: string): Date {
	return dateKeyToDate(value) ?? new Date(value);
}

function formatNumber(value: number): string {
	return new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 }).format(value);
}

function formatCurrency(value: number): string {
	return new Intl.NumberFormat("en-PH", {
		style: "currency",
		currency: "PHP",
		maximumFractionDigits: 2,
	}).format(value);
}

function formatMovementDate(value: string): string {
	const date = movementDate(value);
	if (Number.isNaN(date.getTime())) return value;

	return new Intl.DateTimeFormat("en-PH", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

function createTrend(movements: StockMovement[], period: Period): TrendBucket[] {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const bucketCount = period === 7 ? 7 : period === 30 ? 5 : 13;
	const daysPerBucket = Math.ceil(period / bucketCount);
	const buckets = Array.from({ length: bucketCount }, (_, index) => {
		const date = new Date(today);
		date.setDate(today.getDate() - (period - 1) + index * daysPerBucket);

		return {
			label: new Intl.DateTimeFormat("en-PH", period === 7
				? { weekday: "short" }
				: { month: "short", day: "numeric" }
			).format(date),
			inbound: 0,
			outbound: 0,
		};
	});

	for (const movement of movements) {
		const date = movementDate(movement.created_at);
		if (Number.isNaN(date.getTime())) continue;

		date.setHours(0, 0, 0, 0);
		const daysAgo = Math.floor((today.getTime() - date.getTime()) / 86_400_000);
		if (daysAgo < 0 || daysAgo >= period) continue;

		const offset = period - daysAgo - 1;
		const bucket = buckets[Math.min(bucketCount - 1, Math.floor(offset / daysPerBucket))];
		if (movement.movement_type === "IN") bucket.inbound += Number(movement.quantity);
		if (movement.movement_type === "OUT") bucket.outbound += Number(movement.quantity);
	}

	return buckets;
}

function Dashboard({
	products,
	productsLoading,
	canManageProducts,
	onAddProduct,
	onRefreshProducts,
	onNavigate,
}: DashboardProps) {
	const notify = useToast();
	const [movements, setMovements] = useState<StockMovement[]>([]);
	const [orders, setOrders] = useState<PurchaseOrder[]>([]);
	const [sales, setSales] = useState<SalesOrder[]>([]);
	const [period, setPeriod] = useState<Period>(7);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const loadAnalytics = useCallback(async () => {
		try {
			const [movementData, orderData, salesData] = await Promise.all([
				getStockMovements(),
				getPurchaseOrders(),
				getSalesOrders(),
			]);
			setMovements(movementData);
			setOrders(orderData);
			setSales(salesData);
		} catch (err) {
			notify("error", err instanceof Error ? err.message : "Unable to load dashboard analytics.");
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
		}
	}, [notify]);

	useEffect(() => {
		const timerId = window.setTimeout(() => {
			void loadAnalytics();
		}, 0);

		return () => window.clearTimeout(timerId);
	}, [loadAnalytics]);

	const totalUnits = products.reduce(
		(total, product) => total + Number(product.quantity || 0),
		0
	);
	const inventoryValue = products.reduce(
		(total, product) =>
			total + Number(product.quantity || 0) * Number(product.average_unit_cost || 0),
		0
	);
	const salesInPeriod = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const firstDay = new Date(today);
		firstDay.setDate(today.getDate() - period + 1);

		return sales.filter((sale) => {
			const saleDate = movementDate(sale.created_at);
			if (Number.isNaN(saleDate.getTime())) return false;
			saleDate.setHours(0, 0, 0, 0);
			return saleDate >= firstDay && saleDate <= today;
		});
	}, [sales, period]);
	const periodRevenue = salesInPeriod.reduce(
		(total, sale) => total + Number(sale.total_revenue),
		0
	);
	const periodGrossProfit = salesInPeriod.reduce(
		(total, sale) => total + Number(sale.gross_profit),
		0
	);

	const lowStockProducts = useMemo(
		() => products
			.filter((product) => Number(product.quantity) <= Number(product.reorder_level))
			.sort((first, second) => {
				const firstRatio = Number(first.reorder_level)
					? Number(first.quantity) / Number(first.reorder_level)
					: 0;
				const secondRatio = Number(second.reorder_level)
					? Number(second.quantity) / Number(second.reorder_level)
					: 0;
				return firstRatio - secondRatio;
			})
			.slice(0, 6),
		[products]
	);

	const categoryBreakdown = useMemo(() => {
		const categories = new Map<string, number>();
		for (const product of products) {
			const category = product.category_name || "Uncategorized";
			categories.set(category, (categories.get(category) ?? 0) + Number(product.quantity || 0));
		}

		return [...categories.entries()]
			.map(([name, quantity]) => ({ name, quantity }))
			.sort((first, second) => second.quantity - first.quantity)
			.slice(0, 5);
	}, [products]);

	const trend = useMemo(() => createTrend(movements, period), [movements, period]);
	const chartMaximum = Math.max(
		1,
		...trend.flatMap((bucket) => [bucket.inbound, bucket.outbound])
	);
	const openOrders = orders.filter(
		(order) => order.status === "ORDERED" || order.status === "PARTIALLY_RECEIVED"
	).length;
	const draftOrders = orders.filter((order) => order.status === "DRAFT").length;

	const recentMovements = useMemo(
		() => [...movements]
			.sort((first, second) =>
				movementDate(second.created_at).getTime() - movementDate(first.created_at).getTime()
			)
			.slice(0, 6),
		[movements]
	);

	async function refreshDashboard() {
		setIsRefreshing(true);
		await Promise.all([loadAnalytics(), onRefreshProducts()]);
	}

	const statCards = [
		{
			label: "Products",
			value: formatNumber(products.length),
			detail: "Active catalog items",
			icon: Package,
			color: "teal",
		},
		{
			label: "Units on hand",
			value: formatNumber(totalUnits),
			detail: "Across all products",
			icon: Boxes,
			color: "blue",
		},
		{
			label: "Inventory value",
			value: formatCurrency(inventoryValue),
			detail: "At average purchase cost",
			icon: Wallet,
			color: "green",
		},
		{
			label: "Reorder attention",
			value: formatNumber(products.filter(
				(product) => Number(product.quantity) <= Number(product.reorder_level)
			).length),
			detail: "At or below reorder level",
			icon: AlertTriangle,
			color: "amber",
		},
		{
			label: `Revenue · ${period}d`,
			value: formatCurrency(periodRevenue),
			detail: `${salesInPeriod.length} completed sale${salesInPeriod.length === 1 ? "" : "s"}`,
			icon: CircleDollarSign,
			color: "coral",
		},
		{
			label: `Gross profit · ${period}d`,
			value: formatCurrency(periodGrossProfit),
			detail: "Revenue less recorded average cost",
			icon: TrendingUp,
			color: "green",
		},
	];

	return (
		<section className="dashboard-page">
			<header className="dashboard-header">
				<div>
					<span className="dashboard-eyebrow">WAREHOUSE INTELLIGENCE</span>
					<h1>Dashboard</h1>
					<p>Inventory health, stock flow, and procurement at a glance.</p>
				</div>

				<div className="dashboard-header-actions">
					{canManageProducts && (
						<button
							type="button"
							className="dashboard-add-button"
							onClick={onAddProduct}
						>
							<Package size={17} />
							Add product
						</button>
					)}
					<button
						type="button"
						className="dashboard-refresh-button"
						aria-label="Refresh dashboard analytics"
						title="Refresh dashboard analytics"
						onClick={() => void refreshDashboard()}
						disabled={isRefreshing || isLoading || productsLoading}
					>
						<RefreshCw size={17} className={isRefreshing || productsLoading ? "dashboard-spin" : ""} />
					</button>
				</div>
			</header>

			<div className="dashboard-stat-grid">
				{statCards.map(({ label, value, detail, icon: Icon, color }) => (
					<article className="dashboard-stat" key={label}>
						<div className={`dashboard-stat-icon dashboard-stat-${color}`}>
							<Icon size={19} />
						</div>
						<div className="dashboard-stat-copy">
							<span>{label}</span>
							<strong>{productsLoading && !label.startsWith("Revenue") && !label.startsWith("Gross profit") || isLoading && (label.startsWith("Revenue") || label.startsWith("Gross profit")) ? "—" : value}</strong>
							<small>{detail}</small>
						</div>
					</article>
				))}
			</div>

			<div className="dashboard-main-grid">
				<section className="dashboard-panel dashboard-trend-panel">
					<div className="dashboard-panel-heading">
						<div>
							<span className="dashboard-section-kicker">INVENTORY MOVEMENT</span>
							<h2>Stock flow</h2>
							<p>Units received and released during the selected period.</p>
						</div>
						<div className="dashboard-period-control" aria-label="Chart period">
							{PERIODS.map((days) => (
								<button
									type="button"
									key={days}
									className={period === days ? "active" : ""}
									aria-pressed={period === days}
									onClick={() => setPeriod(days)}
								>
									{days}D
								</button>
							))}
						</div>
					</div>

					<div className="dashboard-chart-legend">
						<span><i className="dashboard-legend-in" />Received</span>
						<span><i className="dashboard-legend-out" />Released</span>
						<button type="button" onClick={() => onNavigate("Stock Movements")}>
							Movement history <ArrowRight size={14} />
						</button>
					</div>

					<div className="dashboard-chart" role="img" aria-label={`Stock received and released over the last ${period} days`}>
						<div className="dashboard-chart-axis">
							<span>{formatNumber(chartMaximum)}</span>
							<span>{formatNumber(chartMaximum / 2)}</span>
							<span>0</span>
						</div>
						<div
							className="dashboard-chart-columns"
							style={{ gridTemplateColumns: `repeat(${trend.length}, minmax(0, 1fr))` }}
						>
							{trend.map((bucket, index) => (
								<div className="dashboard-chart-column" key={`${bucket.label}-${index}`}>
									<div className="dashboard-bar-pair" title={`${bucket.label}: ${bucket.inbound} received, ${bucket.outbound} released`}>
										<span
											className="dashboard-bar dashboard-bar-in"
											style={{ height: `${Math.max(bucket.inbound ? 4 : 0, (bucket.inbound / chartMaximum) * 100)}%` }}
										/>
										<span
											className="dashboard-bar dashboard-bar-out"
											style={{ height: `${Math.max(bucket.outbound ? 4 : 0, (bucket.outbound / chartMaximum) * 100)}%` }}
										/>
									</div>
									<span className="dashboard-chart-label">{bucket.label}</span>
								</div>
							))}
						</div>
					</div>
					{isLoading && <span className="dashboard-chart-loading">Loading movement history...</span>}
					{!isLoading && movements.length === 0 && (
						<span className="dashboard-chart-loading">No stock movements recorded yet.</span>
					)}
				</section>

				<section className="dashboard-panel dashboard-category-panel">
					<div className="dashboard-panel-heading">
						<div>
							<span className="dashboard-section-kicker">CURRENT STOCK</span>
							<h2>By category</h2>
						</div>
						<span className="dashboard-panel-count">{products.length} SKUs</span>
					</div>
					{categoryBreakdown.length ? (
						<div className="dashboard-category-list">
							{categoryBreakdown.map((category, index) => {
								const share = totalUnits
									? (category.quantity / totalUnits) * 100
									: 0;
								return (
									<div className="dashboard-category-row" key={category.name}>
										<div className="dashboard-category-copy">
											<span className={`dashboard-category-mark mark-${index}`} />
											<strong title={category.name}>{category.name}</strong>
											<span>{formatNumber(category.quantity)}</span>
										</div>
										<div className="dashboard-category-track">
											<span style={{ width: `${share}%` }} />
										</div>
										<small>{share.toFixed(0)}% of units</small>
									</div>
								);
							})}
						</div>
					) : (
						<div className="dashboard-empty">Product categories will appear here.</div>
					)}
					<button
						type="button"
						className="dashboard-panel-link"
						onClick={() => onNavigate("Products")}
					>
						View product catalog <ArrowRight size={14} />
					</button>
				</section>
			</div>

			<div className="dashboard-lower-grid">
				<section className="dashboard-panel dashboard-low-stock-panel">
					<div className="dashboard-panel-heading">
						<div>
							<span className="dashboard-section-kicker">ACTION REQUIRED</span>
							<h2>Reorder attention</h2>
							<p>Items at or below their reorder level.</p>
						</div>
						<span className="dashboard-attention-count">
							{products.filter(
								(product) => Number(product.quantity) <= Number(product.reorder_level)
							).length}
						</span>
					</div>
					{lowStockProducts.length ? (
						<div className="dashboard-low-stock-list">
							{lowStockProducts.map((product) => (
								<div className="dashboard-low-stock-row" key={product.id}>
									<ProductThumbnail imageUrl={product.image_url} className="dashboard-product-thumb" />
									<div className="dashboard-low-stock-product">
										<strong>{product.name}</strong>
										<span>{product.sku}</span>
									</div>
									<div className="dashboard-stock-level">
										<strong>{formatNumber(Number(product.quantity))}</strong>
										<span>of {formatNumber(Number(product.reorder_level))}</span>
									</div>
									<span className={Number(product.quantity) === 0 ? "dashboard-stock-badge out" : "dashboard-stock-badge low"}>
										{Number(product.quantity) === 0 ? "Out" : "Low"}
									</span>
								</div>
							))}
						</div>
					) : (
						<div className="dashboard-clear-state">
							<Package size={21} />
							<span>All products are above their reorder levels.</span>
						</div>
					)}
					<button type="button" className="dashboard-panel-link" onClick={() => onNavigate("Products")}>
						Open inventory <ArrowRight size={14} />
					</button>
				</section>

				<section className="dashboard-panel dashboard-activity-panel">
					<div className="dashboard-panel-heading">
						<div>
							<span className="dashboard-section-kicker">LATEST UPDATES</span>
							<h2>Recent stock activity</h2>
						</div>
						<Clock3 size={17} className="dashboard-heading-icon" />
					</div>
					{recentMovements.length ? (
						<div className="dashboard-activity-list">
							{recentMovements.map((movement) => {
								const isInbound = movement.movement_type === "IN";
								const isOutbound = movement.movement_type === "OUT";
								const product = products.find((item) => item.id === movement.product_id);
								return (
									<div className="dashboard-activity-row" key={movement.id}>
										<ProductThumbnail imageUrl={product?.image_url} className="dashboard-product-thumb" />
										<div className="dashboard-activity-copy">
											<strong>{movement.product_name}</strong>
											<span>{movement.sku} · {formatMovementDate(movement.created_at)}</span>
										</div>
										<span className={`dashboard-activity-quantity ${isInbound ? "in" : isOutbound ? "out" : "adjustment"}`}>
											{isInbound ? <ArrowDownToLine size={14} /> : isOutbound ? <ArrowUpFromLine size={14} /> : <Boxes size={14} />}
											{isInbound ? "+" : isOutbound ? "−" : ""}{formatNumber(Number(movement.quantity))}
										</span>
									</div>
								);
							})}
						</div>
					) : (
						<div className="dashboard-empty">Stock transactions will appear here.</div>
					)}
					<button type="button" className="dashboard-panel-link" onClick={() => onNavigate("Stock Movements")}>
						View movement history <ArrowRight size={14} />
					</button>
				</section>
			</div>

			<div className="dashboard-procurement-strip">
				<div className="dashboard-procurement-icon"><ClipboardList size={19} /></div>
				<div>
					<strong>Procurement overview</strong>
					<span>{openOrders} order{openOrders === 1 ? "" : "s"} awaiting delivery · {draftOrders} draft{draftOrders === 1 ? "" : "s"} not yet placed</span>
				</div>
				<button type="button" onClick={() => onNavigate("Purchase Orders")}>
					Open purchase orders <ArrowRight size={15} />
				</button>
			</div>
		</section>
	);
}

export default Dashboard;
