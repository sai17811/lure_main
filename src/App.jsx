import {useEffect} from 'react';
import {AppTabs,Footer,Header,Toast,usePageAttribute} from './components/Layout.jsx';
import {ModalHost} from './modals/Modals.jsx';
import {Cart,Catalog,Categories,Orders,Profile} from './pages/Simple.jsx';
import {Editor} from './pages/Editor.jsx';
import {startPersistence,useStore} from './store/useStore.js';

function Page() {
  const kind = useStore(s => s.kind), id = useStore(s => s.id), hydrated = useStore(s => s.hydrated);
  if (!hydrated) return <div className="boot" aria-busy="true" aria-label="Loading"><div className="skeleton boot-hero"/><div className="boot-grid"><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/></div></div>;
  if (kind === 'cart') return <Cart/>;
  if (kind === 'categories') return <Categories/>;
  if (kind === 'orders') return <Orders/>;
  if (kind === 'profile') return <Profile/>;
  if (id) return <Editor/>;
  return <Catalog/>;
}

export default function App() {
  usePageAttribute();
  useEffect(() => {
    const stop = startPersistence();
    useStore.getState().hydrate();
    return stop;
  },[]);
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <Header/>
    <main id="main" className="shell"><Page/></main>
    <Footer/>
    <AppTabs/>
    <ModalHost/>
    <Toast/>
  </>;
}
