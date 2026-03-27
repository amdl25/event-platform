import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/RecommendationResultsPage.css';

const RecommendationResultsPage = () => {
	const location = useLocation();
	const navigate = useNavigate();

	const stateResults = Array.isArray(location.state?.results) ? location.state.results : [];
	const cachedResults = (() => {
		try {
			const raw = sessionStorage.getItem('recommendationResults');
			return raw ? JSON.parse(raw) : [];
		} catch {
			return [];
		}
	})();

	const results = stateResults.length > 0 ? stateResults : cachedResults;

	return (
		<div className="recommendation-page container-max">
			<header className="recommendation-header">
				<h1>RECOMANDĂRILE NOASTRE</h1>
				<p>
					{results.length > 0
						? `Am găsit ${results.length} ${results.length === 1 ? 'eveniment' : 'evenimente'} pentru criteriile tale.`
						: 'Nu am găsit rezultate pentru selecția curentă.'}
				</p>
			</header>

			{results.length > 0 ? (
				<div className="recommendation-grid">
					{results.map((event) => (
						<article
							key={event.id}
							className="recommendation-card"
							onClick={() => navigate(`/event/${event.id}`)}
						>
							<div className="recommendation-image-wrap">
								{event.image_url ? (
									<img src={event.image_url} alt={event.title} className="recommendation-image" />
								) : (
									<div className="recommendation-image recommendation-placeholder">
										{event.title?.charAt(0) || 'E'}
									</div>
								)}
								<span className="recommendation-price">
									{Number(event.price) > 0 ? `${Number(event.price).toFixed(0)} lei` : 'Gratuit'}
								</span>
							</div>

							<div className="recommendation-content">
								<span className="recommendation-date">
									{new Date(event.start_date).toLocaleDateString('ro-RO', {
										month: 'short',
										day: 'numeric'
									}).toUpperCase()}
								</span>
								<h3>{event.title}</h3>
								<p>{event.location}</p>
							</div>
						</article>
					))}
				</div>
			) : (
				<div className="recommendation-empty">
					<button className="recommendation-retry-btn" onClick={() => navigate('/')}>Reia căutarea</button>
				</div>
			)}

			{results.length > 0 && (
				<div className="recommendation-footer">
					<button className="recommendation-retry-btn" onClick={() => navigate('/')}>Reia căutarea</button>
				</div>
			)}
		</div>
	);
};

export default RecommendationResultsPage;
