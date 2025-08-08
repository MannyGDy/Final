import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';

const AdminDashboard = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!admin) {
      navigate('/admin/login');
      return;
    }

    fetchDashboardData();
  }, [admin, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, usersResponse] = await Promise.all([
        axios.get('/api/admin/dashboard'),
        axios.get('/api/admin/users')
      ]);
      
      setStats(statsResponse.data);
      setUsers(usersResponse.data.users);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const exportUsers = async () => {
    try {
      const response = await axios.get('/api/admin/export/users', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting users:', error);
    }
  };

  const exportConnections = async () => {
    try {
      const response = await axios.get('/api/admin/export/connections', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'connections.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting connections:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone_number.includes(searchTerm)
  );

  if (!admin) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage users and monitor connections</p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'users', name: 'Users' },
              { id: 'exports', name: 'Data Export' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {loading ? (
              <LoadingSpinner size="lg" text="Loading dashboard..." />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Users</h3>
                    <p className="text-3xl font-bold text-primary-600">{stats.totalUsers || 0}</p>
                  </div>
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Connections</h3>
                    <p className="text-3xl font-bold text-green-600">{stats.activeConnections || 0}</p>
                  </div>
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Today's Logins</h3>
                    <p className="text-3xl font-bold text-blue-600">{stats.todayLogins || 0}</p>
                  </div>
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Sessions</h3>
                    <p className="text-3xl font-bold text-purple-600">{stats.totalSessions || 0}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {stats.recentActivity ? (
                          stats.recentActivity.map((activity, index) => (
                            <div key={index} className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-900">{activity.description}</p>
                                <p className="text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-center py-4">No recent activity</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-3">
                        <button
                          onClick={() => setActiveTab('users')}
                          className="w-full btn-primary"
                        >
                          View All Users
                        </button>
                        <button
                          onClick={() => setActiveTab('exports')}
                          className="w-full btn-secondary"
                        >
                          Export Data
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field max-w-xs"
                  />
                </div>
              </div>
            </div>
            <div className="p-6">
              {loading ? (
                <LoadingSpinner size="md" text="Loading users..." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.full_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.phone_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.company_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(user.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.is_active 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'exports' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Export User Data</h3>
                <p className="text-gray-600 mb-4">
                  Download a CSV file containing all registered users with their details.
                </p>
                <button
                  onClick={exportUsers}
                  className="btn-primary"
                >
                  Export Users
                </button>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Connection Logs</h3>
                <p className="text-gray-600 mb-4">
                  Download a CSV file containing all connection logs and session data.
                </p>
                <button
                  onClick={exportConnections}
                  className="btn-primary"
                >
                  Export Connections
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
